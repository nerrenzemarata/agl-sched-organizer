// Free, on-device image cleanup to help the OCR pass read schedule photos better:
// upscale small images, convert to grayscale, and stretch contrast so faint text
// (glare, shadows, low-quality phone photos) becomes easier to separate from the
// background. No network call, no library beyond the canvas API.
export function preprocessForOCR(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not load image for preprocessing'));
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      const minWidth = 1400;
      if (w < minWidth) {
        const scale = minWidth / w;
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
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
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}
