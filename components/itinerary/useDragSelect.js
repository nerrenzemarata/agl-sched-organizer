'use client';

import { useRef, useState } from 'react';

const SNAP_MIN = 15;
const DEFAULT_DURATION = 60;

function snapMin(min) {
  return Math.round(min / SNAP_MIN) * SNAP_MIN;
}

function minToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Google-Calendar-style click-and-drag time selection on a single day column.
// Fires onSelect(startTime, endTime) once, on mouseup, as 'HH:MM' strings —
// a plain click (no real drag) selects a DEFAULT_DURATION block.
export function useDragSelect({ pxPerMin, dayStart, dayEnd, onSelect }) {
  const colRef = useRef(null);
  const [drag, setDrag] = useState(null); // { start, end } in minutes, while dragging

  function minuteAtClientY(clientY) {
    const rect = colRef.current.getBoundingClientRect();
    const raw = (clientY - rect.top) / pxPerMin;
    return Math.max(dayStart, Math.min(dayEnd, snapMin(raw)));
  }

  function handleMouseDown(e) {
    if (e.button !== 0 || e.target.closest('.ev')) return;
    e.preventDefault();
    const anchor = Math.min(minuteAtClientY(e.clientY), dayEnd - SNAP_MIN);
    // Plain mutable object, not React state — lets onUp read the latest
    // range synchronously without calling setState from inside an updater.
    const range = { start: anchor, end: anchor };
    setDrag({ ...range });

    function onMove(moveEvent) {
      const cur = minuteAtClientY(moveEvent.clientY);
      range.start = Math.min(anchor, cur);
      range.end = Math.max(anchor, cur);
      setDrag({ ...range });
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDrag(null);
      const end = range.end > range.start ? range.end : range.start + DEFAULT_DURATION;
      onSelect(minToTime(range.start), minToTime(Math.min(end, dayEnd)));
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return { colRef, drag, handleMouseDown, DEFAULT_DURATION };
}
