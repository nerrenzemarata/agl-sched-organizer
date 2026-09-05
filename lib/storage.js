import { supabase, supabaseConfigured } from './supabaseClient';

const BOOKMARKS_KEY = 'agl-organizers:bookmarks:v1';

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

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

function requireSupabase() {
  if (!supabaseConfigured) throw new SupabaseNotConfiguredError();
  return supabase;
}

// Local, per-browser convenience list of boards you've created or opened —
// the board data itself lives in Supabase (shared by link), this is just a
// shortcut so the homepage can show "your" boards without a login.
function readBookmarks() {
  if (typeof window === 'undefined') return [];
  const list = readJSON(BOOKMARKS_KEY, []);
  return Array.isArray(list) ? list : [];
}

function writeBookmarks(list) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
}

function upsertBookmark(organizer) {
  const list = readBookmarks().filter((o) => o.id !== organizer.id);
  list.push(organizer);
  writeBookmarks(list);
}

export function listOrganizers() {
  return readBookmarks();
}

export function removeBookmark(id) {
  writeBookmarks(readBookmarks().filter((o) => o.id !== id));
}

export async function getOrganizer(id) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('organizers')
    .select('id, name, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const organizer = { id: data.id, name: data.name, createdAt: new Date(data.created_at).getTime() };
  upsertBookmark(organizer);
  return organizer;
}

export async function createOrganizer(name) {
  const db = requireSupabase();
  const id = await uniqueId(name || 'Untitled');
  const organizer = { id, name: (name || '').trim() || 'Untitled Organizer', createdAt: Date.now() };
  const { error } = await db.from('organizers').insert({
    id: organizer.id,
    name: organizer.name,
    state: { members: [], events: {}, visible: {} },
  });
  if (error) throw error;
  upsertBookmark(organizer);
  return organizer;
}

export async function renameOrganizer(id, name) {
  const db = requireSupabase();
  const { error } = await db.from('organizers').update({ name }).eq('id', id);
  if (error) throw error;
  const list = readBookmarks();
  const existing = list.find((o) => o.id === id);
  if (existing) upsertBookmark({ ...existing, name });
}

export async function deleteOrganizer(id) {
  const db = requireSupabase();
  const { error } = await db.from('organizers').delete().eq('id', id);
  if (error) throw error;
  removeBookmark(id);
}

// Per-organizer schedule board state (members/events/visible), stored as one
// jsonb blob per row in Supabase so every device sees the same board.
export async function loadState(id) {
  const db = requireSupabase();
  const { data, error } = await db.from('organizers').select('state').eq('id', id).maybeSingle();
  if (error) throw error;
  const parsed = data?.state;
  if (!parsed || !parsed.members || !parsed.events) {
    return { members: [], events: {}, visible: {} };
  }
  return {
    members: parsed.members,
    events: parsed.events,
    visible: parsed.visible || defaultVisible(parsed.members),
  };
}

export async function saveState(id, state) {
  const db = requireSupabase();
  const { error } = await db
    .from('organizers')
    .update({ state: { members: state.members, events: state.events, visible: state.visible } })
    .eq('id', id);
  if (error) console.error('Failed to save schedule data', error);
}

// Downscale + re-encode an uploaded photo so boards don't bloat with
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

export async function uniqueId(name) {
  const db = requireSupabase();
  const base = slugify(name);
  const { data, error } = await db.from('organizers').select('id').like('id', `${base}%`);
  if (error) throw error;
  const existingIds = new Set((data || []).map((o) => o.id));
  let id = base;
  let n = 2;
  while (existingIds.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}
