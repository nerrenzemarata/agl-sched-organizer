export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DAY_START = 6 * 60; // 6:00 AM
export const DAY_END = 22 * 60; // 10:00 PM
export const PX_PER_MIN = 26 / 30;
export const GRID_H = (DAY_END - DAY_START) * PX_PER_MIN;
export const SLOT = 30; // minutes, for the free/busy sweep

export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fmt(min) {
  let h = Math.floor(min / 60);
  const m = min % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return m === 0 ? `${hh}${ap}` : `${hh}:${String(m).padStart(2, '0')}${ap}`;
}

export function computeFreeWindows(members, events, day) {
  const nSlots = (DAY_END - DAY_START) / SLOT;
  const busy = new Array(nSlots).fill(false);
  members.forEach((p) => {
    (events[p.id]?.[day] || []).forEach((ev) => {
      const s = toMin(ev.start);
      const e = toMin(ev.end);
      for (let t = s; t < e; t += SLOT) {
        const idx = Math.floor((t - DAY_START) / SLOT);
        if (idx >= 0 && idx < nSlots) busy[idx] = true;
      }
    });
  });
  const ranges = [];
  let start = null;
  for (let i = 0; i <= nSlots; i++) {
    const free = i < nSlots ? !busy[i] : false;
    if (free && start === null) start = i;
    if (!free && start !== null) {
      ranges.push([DAY_START + start * SLOT, DAY_START + i * SLOT]);
      start = null;
    }
  }
  return { busy, ranges, nSlots };
}

export function layoutClusters(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const clusters = [];
  let cur = [];
  let curEnd = -1;
  sorted.forEach((ev) => {
    if (cur.length && ev.start >= curEnd) {
      clusters.push(cur);
      cur = [];
      curEnd = -1;
    }
    cur.push(ev);
    curEnd = Math.max(curEnd, ev.end);
  });
  if (cur.length) clusters.push(cur);

  clusters.forEach((cluster) => {
    const colsEnd = [];
    cluster.forEach((ev) => {
      let placed = false;
      for (let c = 0; c < colsEnd.length; c++) {
        if (colsEnd[c] <= ev.start) {
          ev.col = c;
          colsEnd[c] = ev.end;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev.col = colsEnd.length;
        colsEnd.push(ev.end);
      }
    });
    const total = colsEnd.length;
    cluster.forEach((ev) => {
      ev.cols = total;
    });
  });

  return sorted;
}
