// Turns raw OCR text (from tesseract.js, running fully on-device — no API, no cost)
// into best-effort weekly schedule rows. This is inherently a heuristic: it works
// well on clean, typed schedule lists ("Monday 9:00-10:30 AM Calculus"), and much
// less reliably on photographed calendar-app grid screenshots, since OCR reads text,
// not table layout. Every row it produces is marked approx so it's obvious it needs
// a human glance before trusting it.

const DAY_ALIASES = [
  ['sunday', 'Sun'],
  ['sun', 'Sun'],
  ['monday', 'Mon'],
  ['mon', 'Mon'],
  ['tuesday', 'Tue'],
  ['tues', 'Tue'],
  ['tue', 'Tue'],
  ['wednesday', 'Wed'],
  ['weds', 'Wed'],
  ['wed', 'Wed'],
  ['thursday', 'Thu'],
  ['thurs', 'Thu'],
  ['thur', 'Thu'],
  ['thu', 'Thu'],
  ['friday', 'Fri'],
  ['fri', 'Fri'],
  ['saturday', 'Sat'],
  ['sat', 'Sat'],
].sort((a, b) => b[0].length - a[0].length); // longest alias first so "tuesday" wins over "tue"

const TIME_RANGE_RE =
  /(\d{1,2})(?::(\d{2}))?\s*([AaPp]\.?[Mm]\.?)?\s*(?:-|–|—|to|until)\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp]\.?[Mm]\.?)?/;

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Exact match first; if that fails, tolerate the kind of single-letter OCR slip
// ("Momday", "Wedhesday") that a strict regex would otherwise miss entirely.
function findDay(line) {
  const lower = line.toLowerCase();
  for (const [alias, day] of DAY_ALIASES) {
    const re = new RegExp(`\\b${alias}\\b`, 'i');
    const m = lower.match(re);
    if (m) return { day, matchText: line.substr(m.index, alias.length) };
  }

  const words = line.match(/[a-z]{3,9}/gi) || [];
  for (const word of words) {
    const w = word.toLowerCase();
    let best = null;
    for (const [alias, day] of DAY_ALIASES) {
      if (Math.abs(alias.length - w.length) > 2) continue;
      const dist = levenshtein(alias, w);
      const threshold = alias.length <= 4 ? 1 : 2;
      if (dist <= threshold && (!best || dist < best.dist)) best = { day, dist };
    }
    if (best) return { day: best.day, matchText: word };
  }
  return null;
}

// Matches a single, standalone token (e.g. one grid header cell's text) against a
// day name/abbreviation — exact first, then a small fuzzy tolerance for OCR slips.
export function matchDayToken(word) {
  const w = (word || '').trim().toLowerCase();
  if (!w) return null;
  for (const [alias, day] of DAY_ALIASES) {
    if (w === alias) return day;
  }
  for (const [alias, day] of DAY_ALIASES) {
    if (Math.abs(alias.length - w.length) > 2) continue;
    const dist = levenshtein(alias, w);
    const threshold = alias.length <= 4 ? 1 : 2;
    if (dist <= threshold) return day;
  }
  return null;
}

function to24Hour(hourRaw, minuteRaw, meridiemRaw, otherMeridiemRaw, otherHourRaw) {
  let hour = parseInt(hourRaw, 10);
  const minute = minuteRaw ? parseInt(minuteRaw, 10) : 0;
  const meridiem = meridiemRaw ? meridiemRaw[0].toLowerCase() : null;

  if (meridiem === 'p' && hour < 12) hour += 12;
  if (meridiem === 'a' && hour === 12) hour = 0;

  if (!meridiem) {
    if (hour > 12) {
      // already 24-hour, e.g. "13:00" — leave as-is
    } else if (otherMeridiemRaw) {
      // borrow the other side's meridiem, adjusting for crossing noon
      const otherMer = otherMeridiemRaw[0].toLowerCase();
      const otherHour = parseInt(otherHourRaw, 10);
      const crossesNoon = otherMer === 'p' && hour > otherHour;
      const mer = crossesNoon ? 'a' : otherMer;
      if (mer === 'p' && hour < 12) hour += 12;
      if (mer === 'a' && hour === 12) hour = 0;
    } else if (hour >= 1 && hour <= 7) {
      // no meridiem anywhere on the line — class times before 7:59 with no AM marker
      // are far more often "1pm" style shorthand than 1-7 in the morning.
      hour += 12;
    }
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function cleanLabel(line, removedBits) {
  let label = line;
  removedBits.forEach((bit) => {
    if (bit) label = label.replace(bit, ' ');
  });
  label = label
    .replace(/[-–—|_•·:]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return label.slice(0, 60);
}

export function parseScheduleText(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = [];
  let currentDay = null;

  lines.forEach((line) => {
    const dayHit = findDay(line);
    if (dayHit) currentDay = dayHit.day;

    const timeMatch = line.match(TIME_RANGE_RE);
    if (!timeMatch || !currentDay) return;

    const [full, h1, m1, mer1, h2, m2, mer2] = timeMatch;
    const start = to24Hour(h1, m1, mer1, mer2, h2);
    const end = to24Hour(h2, m2, mer2, mer1, h1);
    if (start === end) return;

    const label = cleanLabel(line, [dayHit?.matchText, full]) || 'Class';

    rows.push({ day: currentDay, start, end, label, approx: true });
  });

  return rows;
}

// Runs the parser over several OCR readings of the same photo (e.g. different page
// segmentation modes) and merges everything found, de-duplicating rows that landed
// on the same day/time from more than one pass.
export function mergeScheduleReadings(textPasses) {
  const seen = new Set();
  const merged = [];
  textPasses.forEach((text) => {
    parseScheduleText(text).forEach((row) => {
      const key = `${row.day}|${row.start}|${row.end}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(row);
    });
  });
  return merged;
}
