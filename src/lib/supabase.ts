import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing PUBLIC_SUPABASE_URL environment variable');
}

// Public client — anon key, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey || '');

// Admin client — service key, bypasses RLS. Server-side only.
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
