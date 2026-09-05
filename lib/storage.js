const REGISTRY_KEY = 'agl-organizers:v1';
const MIGRATION_FLAG = 'agl-organizers:migrated-v1';
const LEGACY_KEY = 'agl-sched-organizer:v1';

function scheduleKey(id) {
  return `agl-sched-organizer:v1:${id}`;
}

function defaultVisible(members) {
  const v = {};
  members.forEach((m) => {
    v[m.id] = true;
  });
  return v;
}

function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// One-time carry-over from the old single-organizer storage key into the new
// per-organizer scheme, so a returning user doesn't lose their existing board.
function migrateLegacyIfNeeded() {
  if (window.localStorage.getItem(MIGRATION_FLAG)) return;
  window.localStorage.setItem(MIGRATION_FLAG, '1');

  try {
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (!legacyRaw) return;
    const parsed = JSON.parse(legacyRaw);
    if (!parsed.members || !parsed.events) return;

    const id = 'main';
    window.localStorage.setItem(
      scheduleKey(id),
      JSON.stringify({
        members: parsed.members,
        events: parsed.events,
        visible: parsed.visible || defaultVisible(parsed.members),
      })
    );

    const registry = readJSON(REGISTRY_KEY, []);
    if (!registry.some((o) => o.id === id)) {
      registry.push({ id, name: 'AGL Org', createdAt: Date.now() });
      window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    }
  } catch {
    // malformed legacy data — nothing worth carrying over
  }
}

export function listOrganizers() {
  if (typeof window === 'undefined') return [];
  migrateLegacyIfNeeded();
  const registry = readJSON(REGISTRY_KEY, []);
  return Array.isArray(registry) ? registry : [];
}

function saveOrganizers(list) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(list));
}

export function getOrganizer(id) {
  return listOrganizers().find((o) => o.id === id) || null;
}

export function createOrganizer(name) {
  const list = listOrganizers();
  const id = uniqueId(name || 'Untitled', list.map((o) => o.id));
  const organizer = { id, name: (name || '').trim() || 'Untitled Organizer', createdAt: Date.now() };
  saveOrganizers([...list, organizer]);
  return organizer;
}

export function renameOrganizer(id, name) {
  const list = listOrganizers();
  saveOrganizers(list.map((o) => (o.id === id ? { ...o, name } : o)));
}

export function deleteOrganizer(id) {
  saveOrganizers(listOrganizers().filter((o) => o.id !== id));
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(scheduleKey(id));
  }
}

// Per-organizer schedule board state (members/events/visible), isolated by id
// so creating or editing one organizer never touches another's data.
export function loadState(id) {
  if (typeof window === 'undefined') return { members: [], events: {}, visible: {} };
  const parsed = readJSON(scheduleKey(id), null);
  if (!parsed || !parsed.members || !parsed.events) {
    return { members: [], events: {}, visible: {} };
  }
  return {
    members: parsed.members,
    events: parsed.events,
    visible: parsed.visible || defaultVisible(parsed.members),
  };
}

export function saveState(id, state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      scheduleKey(id),
      JSON.stringify({ members: state.members, events: state.events, visible: state.visible })
    );
  } catch (err) {
    console.error('Failed to save schedule data', err);
  }
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
  return base || `id-${Date.now()}`;
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
