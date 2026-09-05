import { SEED_MEMBERS, SEED_EVENTS } from './seedData';

const KEY = 'agl-sched-organizer:v1';

export function loadState() {
  if (typeof window === 'undefined') {
    return { members: SEED_MEMBERS, events: SEED_EVENTS, visible: defaultVisible(SEED_MEMBERS) };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      return { members: SEED_MEMBERS, events: SEED_EVENTS, visible: defaultVisible(SEED_MEMBERS) };
    }
    const parsed = JSON.parse(raw);
    if (!parsed.members || !parsed.events) throw new Error('malformed');
    return {
      members: parsed.members,
      events: parsed.events,
      visible: parsed.visible || defaultVisible(parsed.members),
    };
  } catch {
    return { members: SEED_MEMBERS, events: SEED_EVENTS, visible: defaultVisible(SEED_MEMBERS) };
  }
}

export function saveState(state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ members: state.members, events: state.events, visible: state.visible })
    );
  } catch (err) {
    console.error('Failed to save schedule data', err);
  }
}

export function resetToSeed() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}

function defaultVisible(members) {
  const v = {};
  members.forEach((m) => {
    v[m.id] = true;
  });
  return v;
}

// Downscale + re-encode an uploaded photo so we don't bloat localStorage with
// full-resolution camera photos (which can be several MB each).
export function readAndCompressImage(file, maxDim = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read image'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function slugify(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `member-${Date.now()}`;
}

export function uniqueId(name, existingIds) {
  const base = slugify(name);
  let id = base;
  let n = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}
