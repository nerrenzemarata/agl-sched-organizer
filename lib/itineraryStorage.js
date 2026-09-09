import { supabase, supabaseConfigured } from './supabaseClient';
import { slugify } from './storage';

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

function rowToItinerary(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).getTime(),
    color: row.color || null,
  };
}

function rowToEvent(row) {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    allDay: row.all_day,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location || '',
    description: row.description || '',
    color: row.color,
  };
}

// Staff itineraries are separate shareable boards, same access model as the
// schedule organizers — the homepage lists every one that exists.
export async function listItineraries() {
  const db = requireSupabase();
  const { data, error } = await db
    .from('staff_itineraries')
    .select('id, name, created_at, color')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToItinerary);
}

export async function getItinerary(id) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('staff_itineraries')
    .select('id, name, created_at, color')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToItinerary(data);
}

async function uniqueItineraryId(name) {
  const db = requireSupabase();
  const base = slugify(name || 'Untitled');
  const { data, error } = await db.from('staff_itineraries').select('id').like('id', `${base}%`);
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

export async function createItinerary(name) {
  const db = requireSupabase();
  const id = await uniqueItineraryId(name);
  const itinerary = { id, name: (name || '').trim() || 'Untitled Itinerary', createdAt: Date.now() };
  const { error } = await db.from('staff_itineraries').insert({ id: itinerary.id, name: itinerary.name });
  if (error) throw error;
  return itinerary;
}

export async function renameItinerary(id, name) {
  const db = requireSupabase();
  const { error } = await db.from('staff_itineraries').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function updateItineraryColor(id, color) {
  const db = requireSupabase();
  const { error } = await db.from('staff_itineraries').update({ color }).eq('id', id);
  if (error) throw error;
}

export async function deleteItinerary(id) {
  const db = requireSupabase();
  const { error } = await db.from('staff_itineraries').delete().eq('id', id);
  if (error) throw error;
}

// Each itinerary's events are small in number, so load them in full and
// filter client-side per view instead of querying a date range per navigation.
export async function listEvents(itineraryId) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('staff_events')
    .select('*')
    .eq('itinerary_id', itineraryId)
    .order('start_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToEvent);
}

// Powers the merged "all itineraries" overview — one query instead of one
// per itinerary.
export async function listAllEvents() {
  const db = requireSupabase();
  const { data, error } = await db.from('staff_events').select('*').order('start_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToEvent);
}

export async function createEvent(itineraryId, event) {
  const db = requireSupabase();
  const { data, error } = await db
    .from('staff_events')
    .insert({
      itinerary_id: itineraryId,
      title: event.title,
      start_date: event.startDate,
      end_date: event.endDate,
      all_day: event.allDay,
      start_time: event.allDay ? null : event.startTime,
      end_time: event.allDay ? null : event.endTime,
      location: event.location || null,
      description: event.description || null,
      color: event.color,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToEvent(data);
}

export async function updateEvent(id, event) {
  const db = requireSupabase();
  const { error } = await db
    .from('staff_events')
    .update({
      title: event.title,
      start_date: event.startDate,
      end_date: event.endDate,
      all_day: event.allDay,
      start_time: event.allDay ? null : event.startTime,
      end_time: event.allDay ? null : event.endTime,
      location: event.location || null,
      description: event.description || null,
      color: event.color,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id) {
  const db = requireSupabase();
  const { error } = await db.from('staff_events').delete().eq('id', id);
  if (error) throw error;
}
