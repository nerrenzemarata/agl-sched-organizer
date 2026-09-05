// Free, on-device image cleanup to help the OCR pass read schedule photos better:
// upscale small images, convert to grayscale, and stretch contrast so faint text
// (glare, shadows, low-quality phone photos) becomes easier to separate from the
// background. No network call, no library beyond the canvas API.

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not load image'));
    img.onload = () => resolve(img);
    img.src = dataUrl;
  });
}

function targetSize(img, minWidth = 1400) {
  let w = img.width;
  let h = img.height;
  if (w < minWidth) {
    const scale = minWidth / w;
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }
  return { w, h };
}

// Returns { dataUrl, width, height } — width/height matter because a second render
// (see renderColorCanvas below) needs to reproduce the exact same pixel grid so OCR
// bounding boxes line up with sampled pixel colors.
export async function preprocessForOCR(dataUrl) {
  const img = await loadImage(dataUrl);
  const { w, h } = targetSize(img);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const gray = new Float32Array(w * h);
  let min = 255;
  let max = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[p] = g;
    if (g < min) min = g;
    if (g > max) max = g;
  }
  const range = Math.max(1, max - min);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let v = ((gray[p] - min) / range) * 255;
    v = Math.min(255, Math.max(0, (v - 128) * 1.2 + 128)); // extra contrast punch
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
  return { dataUrl: canvas.toDataURL('image/png'), width: w, height: h };
}

// Renders the original (color, un-preprocessed) photo at a specific pixel size so
// its colors can be sampled at the same coordinates as OCR bounding boxes produced
// from a same-sized preprocessed render.
export async function renderColorCanvas(dataUrl, width, height) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return ctx;
}
