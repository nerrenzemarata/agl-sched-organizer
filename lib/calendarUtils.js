// Plain date-math helpers for the Staff Itinerary (month/week/day views).
// Dates are always local midnight Date objects; ISO strings are 'YYYY-MM-DD'.

import { toMin } from './time';

const FREE_SLOT = 30; // minutes, for the free/busy sweep

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fromISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// 6 full weeks (42 days) covering the given month, starting on the Sunday
// on/before the 1st — enough to always fully tile the month grid.
export function getMonthGrid(date) {
  const gridStart = startOfWeek(startOfMonth(date));
  const days = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i));
  return days;
}

export function formatMonthYear(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatWeekRange(date) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${MONTH_LABELS[start.getMonth()].slice(0, 3)} ${start.getDate()}`;
  const endLabel = sameMonth
    ? `${end.getDate()}`
    : `${MONTH_LABELS[end.getMonth()].slice(0, 3)} ${end.getDate()}`;
  return `${startLabel}–${endLabel}, ${end.getFullYear()}`;
}

export function formatDayHeading(date) {
  return `${WEEKDAY_FULL[date.getDay()]}, ${MONTH_LABELS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Mirrors lib/time.js's computeFreeWindows, but for real-dated itinerary
// events instead of a recurring weekly template: finds the gaps on a given
// calendar date where none of the passed-in events are busy, so a merged
// "everyone's vacant" view can be built the same way FreeGrid does for AGL.
export function computeDayFreeWindows(events, iso, dayStart = 0, dayEnd = 24 * 60) {
  const nSlots = (dayEnd - dayStart) / FREE_SLOT;
  const busy = new Array(nSlots).fill(false);
  events.forEach((ev) => {
    if (ev.startDate > iso || ev.endDate < iso) return;
    const isFullDay = ev.allDay || ev.startDate !== ev.endDate;
    const s = isFullDay ? dayStart : toMin(ev.startTime || '00:00');
    const e = isFullDay ? dayEnd : toMin(ev.endTime || '23:59');
    for (let t = Math.max(s, dayStart); t < Math.min(e, dayEnd); t += FREE_SLOT) {
      const idx = Math.floor((t - dayStart) / FREE_SLOT);
      if (idx >= 0 && idx < nSlots) busy[idx] = true;
    }
  });
  const ranges = [];
  let start = null;
  for (let i = 0; i <= nSlots; i++) {
    const free = i < nSlots ? !busy[i] : false;
    if (free && start === null) start = i;
    if (!free && start !== null) {
      ranges.push([dayStart + start * FREE_SLOT, dayStart + i * FREE_SLOT]);
      start = null;
    }
  }
  return { ranges, dayStart, dayEnd };
}
