import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Boards are shared by link (no login), so every visitor uses the same
// public anon key — access control is "do you know the board's id/URL",
// not a signed-in session.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;
