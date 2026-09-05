// Understands the *other* common schedule photo shape: a spreadsheet-style weekly
// grid (day columns × time-of-day rows, one colored cell block per class) rather
// than a typed list. OCR alone can't recover this — it reads text, not table
// structure — so this combines OCR word positions (from tesseract.js, still
// free/on-device) with direct pixel-color sampling on the original photo to find
// where each colored block starts and ends vertically, then reads its label.
//
// Word-level (not line-level) bboxes are used for headers/row-labels on purpose:
// tesseract's own line-clustering can merge several adjacent header cells (e.g.
// "Wednesday Thursday Friday Saturday Sunday") into a single reported "line",
// which breaks whole-string day matching. Individual word boxes stay accurate to
// their true on-screen position regardless of how the text got grouped.

import { matchDayToken } from './scheduleParser';
import { DAYS as WEEKDAY_ORDER } from './time'; // Mon-first — matches this app's convention and how these grids are laid out

const TIME_TOKEN_RE = /(\d{1,2}):(\d{2})/;
const COLOR_MATCH_THRESHOLD = 42; // Euclidean RGB distance — same block vs. a new one
const MIN_BLOCK_ROWS = 1;

function flattenWords(page) {
  const words = [];
  (page?.blocks || []).forEach((b) =>
    (b.paragraphs || []).forEach((p) =>
      (p.lines || []).forEach((l) => (l.words || []).forEach((w) => words.push(w)))
    )
  );
  return words;
}

function flattenLines(page) {
  const lines = [];
  (page?.blocks || []).forEach((b) =>
    (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => lines.push(l)))
  );
  return lines;
}

function bboxCenter(bbox) {
  return { x: (bbox.x0 + bbox.x1) / 2, y: (bbox.y0 + bbox.y1) / 2 };
}

function median(nums) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Averages a small vertical strip around y rather than reading one exact pixel —
// a single sample can land on a thin 1-2px gridline and read as a totally
// different color, which otherwise fools the block-boundary detection below into
// splitting one uniform class block into several.
function sampleColor(ctx, x, y, w, h, radius = 1) {
  const px = Math.min(w - 1, Math.max(0, Math.round(x)));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    const py = Math.min(h - 1, Math.max(0, Math.round(y) + dy));
    const d = ctx.getImageData(px, py, 1, 1).data;
    r += d[0];
    g += d[1];
    b += d[2];
    n++;
  }
  return [r / n, g / n, b / n];
}

function isEmptyCell([r, g, b]) {
  return r > 232 && g > 232 && b > 232;
}

function colorDist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function minutesToHHMM(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Fills in any weekday whose header cell OCR completely missed, by interpolating
// from the columns we did find (they're evenly spaced in a spreadsheet grid).
function fillMissingColumns(known) {
  if (known.length < 2) return known;
  const byDay = new Map(known.map((c) => [c.day, c]));
  const present = WEEKDAY_ORDER.filter((d) => byDay.has(d));
  if (present.length < 2) return known;

  const spacings = [];
  for (let i = 1; i < present.length; i++) {
    const gapDays = WEEKDAY_ORDER.indexOf(present[i]) - WEEKDAY_ORDER.indexOf(present[i - 1]);
    const gapPx = byDay.get(present[i]).xCenter - byDay.get(present[i - 1]).xCenter;
    if (gapDays > 0) spacings.push(gapPx / gapDays);
  }
  const stepPx = median(spacings);
  if (!stepPx) return known;

  const filled = [...known];
  WEEKDAY_ORDER.forEach((day, idx) => {
    if (byDay.has(day)) return;
    // Anchor from whichever known column is closest in weekday order, to keep
    // the extrapolation short — using one fixed anchor for every gap compounds
    // error fast when several non-adjacent columns are missing.
    let nearestDay = present[0];
    let bestDist = Infinity;
    present.forEach((d) => {
      const dist = Math.abs(WEEKDAY_ORDER.indexOf(d) - idx);
      if (dist < bestDist) {
        bestDist = dist;
        nearestDay = d;
      }
    });
    const anchor = byDay.get(nearestDay);
    const anchorIdx = WEEKDAY_ORDER.indexOf(nearestDay);
    filled.push({ day, xCenter: anchor.xCenter + (idx - anchorIdx) * stepPx });
  });
  return filled;
}

/**
 * @param {object} args
 * @param {object} args.page - tesseract `data` (recognized with output.blocks = true)
 * @param {CanvasRenderingContext2D} args.colorCtx - original-color render at the same
 *   pixel size as the image that was OCR'd, so bbox coordinates line up with pixels.
 * @param {number} args.imageWidth
 * @param {number} args.imageHeight
 * @returns {Array<{day,start,end,label,approx}>}
 */
export function parseGridSchedule({ page, colorCtx, imageWidth, imageHeight }) {
  const words = flattenWords(page).filter((w) => w.text && w.text.trim());

  const dayHeaderWords = [];
  words.forEach((w) => {
    const day = matchDayToken(w.text.trim());
    if (day) dayHeaderWords.push({ day, ...bboxCenter(w.bbox), bbox: w.bbox });
  });
  // Keep only the best (topmost-cluster) match per day in case a day name is echoed
  // elsewhere; header cells should all sit at roughly the same y.
  if (dayHeaderWords.length === 0) return [];
  const headerY = median(dayHeaderWords.map((d) => d.y));
  const nearHeaderRow = dayHeaderWords.filter((d) => Math.abs(d.y - headerY) < imageHeight * 0.08);
  const byDay = new Map();
  nearHeaderRow.forEach((d) => {
    if (!byDay.has(d.day)) byDay.set(d.day, d);
  });
  const rawDayHeaders = [...byDay.values()];
  if (rawDayHeaders.length < 2) return []; // not enough structure to call this a grid

  const columns = fillMissingColumns(rawDayHeaders.map((d) => ({ day: d.day, xCenter: d.x })))
    .sort((a, b) => a.xCenter - b.xCenter);

  const headerBottom = Math.max(...rawDayHeaders.map((d) => d.bbox.y1));
  const columnLeftEdge = Math.min(...rawDayHeaders.map((d) => d.bbox.x0));

  const rowMarkers = [];
  words.forEach((w) => {
    if (w.bbox.x1 >= columnLeftEdge) return; // must sit left of the grid body
    const m = w.text.match(TIME_TOKEN_RE);
    if (!m) return;
    rowMarkers.push({ y: bboxCenter(w.bbox).y, hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) });
  });
  if (rowMarkers.length < 3) return []; // not enough row structure either

  rowMarkers.sort((a, b) => a.y - b.y);
  const gaps = [];
  for (let i = 1; i < rowMarkers.length; i++) {
    const gap = rowMarkers[i].y - rowMarkers[i - 1].y;
    if (gap > 2) gaps.push(gap);
  }
  const rawSpacing = median(gaps) || 20;
  // Row labels are every 30 minutes, but OCR sometimes only catches one label per
  // hour — if the typical gap looks like a double step, halve it back to 30 min.
  const rowHeightPx = rawSpacing;

  const first = rowMarkers[0];
  let firstMinutes;
  if (first.hour === 12) firstMinutes = 12 * 60 + first.minute;
  else if (first.hour >= 1 && first.hour <= 11) firstMinutes = first.hour * 60 + first.minute;
  else firstMinutes = (first.hour % 24) * 60 + first.minute;
  const firstY = first.y;

  // Stop at the last row label we actually found (plus a little slack), not the
  // bottom of the photo — anything past the real table (borders, margins, other
  // content below a cropped screenshot) can otherwise read as a uniform stripe
  // that fools every column into reporting a fake block at the same time.
  const lastMarkerY = rowMarkers[rowMarkers.length - 1].y;
  const gridBottomY = Math.min(imageHeight - 4, lastMarkerY + rowHeightPx * 1.5);
  const numRows = Math.max(1, Math.min(120, Math.round((gridBottomY - firstY) / rowHeightPx) + 1));

  const yToMinutes = (y) => firstMinutes + Math.round((y - firstY) / rowHeightPx) * 30;

  const blocksByDay = {};
  columns.forEach(({ day, xCenter }) => {
    const rows = [];
    for (let r = 0; r < numRows; r++) {
      const y = firstY + r * rowHeightPx;
      if (y > imageHeight - 1) break;
      const color = sampleColor(colorCtx, xCenter, y, imageWidth, imageHeight);
      rows.push({ r, color, empty: isEmptyCell(color) });
    }
    const blocks = [];
    let cur = null;
    const pushCur = () => {
      const n = cur.rowColors.length;
      cur.avgColor = cur.rowColors.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]).map((v) => v / n);
      blocks.push(cur);
    };
    rows.forEach((row) => {
      if (row.empty) {
        if (cur) pushCur();
        cur = null;
        return;
      }
      if (!cur) {
        cur = { startRow: row.r, endRow: row.r, color: row.color, rowColors: [row.color] };
      } else if (colorDist(cur.color, row.color) <= COLOR_MATCH_THRESHOLD) {
        // Compare to the most recent row, not the block's first row — JPEG noise
        // and subtle gradients drift a bit over many rows even within one solid
        // fill, and comparing only to the original color falsely split it up.
        cur.endRow = row.r;
        cur.color = row.color;
        cur.rowColors.push(row.color);
      } else {
        pushCur();
        cur = { startRow: row.r, endRow: row.r, color: row.color, rowColors: [row.color] };
      }
    });
    if (cur) pushCur();

    // Safety net: a stray gridline-colored sample can still occasionally corrupt
    // the rolling reference above and split one class into back-to-back
    // fragments. Re-merge blocks that touch with no gap and whose overall
    // (averaged) colors are still close — genuinely different back-to-back
    // classes have distinctly different colors and won't be affected.
    const merged = [];
    blocks.forEach((b) => {
      const last = merged[merged.length - 1];
      if (last && b.startRow === last.endRow + 1 && colorDist(last.avgColor, b.avgColor) <= COLOR_MATCH_THRESHOLD * 1.4) {
        last.endRow = b.endRow;
        last.avgColor = [
          (last.avgColor[0] + b.avgColor[0]) / 2,
          (last.avgColor[1] + b.avgColor[1]) / 2,
          (last.avgColor[2] + b.avgColor[2]) / 2,
        ];
      } else {
        merged.push(b);
      }
    });

    blocksByDay[day] = merged.filter((b) => b.endRow - b.startRow + 1 >= MIN_BLOCK_ROWS);
  });

  // Assign every non-header, non-row-label OCR *line* (not word — multi-word
  // labels like "Elec Mach" read as one line and should stay joined) as a label
  // onto whichever block it visually sits inside.
  const labelCandidates = flattenLines(page).filter((l) => {
    const text = (l.text || '').trim();
    if (!text) return false;
    if (matchDayToken(text)) return false;
    if (l.bbox.x1 < columnLeftEdge) return false; // row-header column
    if (l.bbox.y1 <= headerBottom) return false; // header row itself
    return true;
  });

  labelCandidates.forEach((l) => {
    const { x, y } = bboxCenter(l.bbox);
    let nearestCol = columns[0];
    let bestDist = Infinity;
    columns.forEach((c) => {
      const dist = Math.abs(c.xCenter - x);
      if (dist < bestDist) {
        bestDist = dist;
        nearestCol = c;
      }
    });
    const approxRow = (y - firstY) / rowHeightPx;
    const blocks = blocksByDay[nearestCol.day] || [];
    const hit = blocks.find((b) => approxRow >= b.startRow - 0.6 && approxRow <= b.endRow + 0.6);
    const text = l.text.trim();
    if (hit) {
      hit.label = hit.label ? `${hit.label} ${text}` : text;
    }
  });

  const results = [];
  columns.forEach(({ day }) => {
    (blocksByDay[day] || []).forEach((b) => {
      const startMin = yToMinutes(firstY + b.startRow * rowHeightPx);
      const endMin = yToMinutes(firstY + (b.endRow + 1) * rowHeightPx);
      if (endMin <= startMin || endMin - startMin > 12 * 60) return;
      results.push({
        day,
        start: minutesToHHMM(startMin),
        end: minutesToHHMM(endMin),
        label: (b.label || 'Class').slice(0, 60),
        approx: true,
      });
    });
  });

  return results;
}
