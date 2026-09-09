import { createClient } from '@supabase/supabase-js';

// Fallback values so the app connects out of the box even if .env.local is
// missing, misplaced, or edited without restarting the dev server. Safe to
// keep in source: this is the public/publishable key, meant to be exposed
// in client-side JS (see the access-model note below).
const DEFAULT_URL = 'https://qicylzwhpbkrsnwnfxbd.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_JHuaz8a2ooXv94vj4lfLmw_dh-zqg08';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

// Boards are shared by link (no login), so every visitor uses the same
// public anon key — access control is "do you know the board's id/URL",
// not a signed-in session.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;
