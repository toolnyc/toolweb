import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Resend } from 'resend';

export interface RuntimeEnv {
  PUBLIC_SUPABASE_URL: string;
  PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: string;
  SUPABASE_SECRET_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  R2_PUBLIC_URL?: string;
  RESEND_API_KEY?: string;
  PUBLIC_SITE_URL?: string;
  NTFY_TOPIC?: string;
  [key: string]: unknown;
}

let _env: RuntimeEnv | null = null;
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;
let _stripe: Stripe | null = null;
let _resend: Resend | null = null;

export function initClients(env: Record<string, unknown>): void {
  _env = env as RuntimeEnv;

  const url = _env.PUBLIC_SUPABASE_URL;
  const anonKey = _env.PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !anonKey) {
    console.warn('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  }

  if (url && anonKey && !_supabase) {
    _supabase = createClient(url, anonKey);
  }

  const serviceKey = _env.SUPABASE_SECRET_KEY;
  if (url && serviceKey && !_supabaseAdmin) {
    _supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  const stripeKey = _env.STRIPE_SECRET_KEY;
  if (stripeKey && !_stripe) {
    _stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' });
  }

  const resendKey = _env.RESEND_API_KEY;
  if (resendKey && !_resend) {
    _resend = new Resend(resendKey);
  }
}

export function getEnv(): RuntimeEnv {
  if (!_env) throw new Error('initClients() has not been called — missing runtime env');
  return _env;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) throw new Error('Supabase client not initialized (missing PUBLIC_SUPABASE_URL)');
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) throw new Error('supabaseAdmin not configured (missing SUPABASE_SECRET_KEY)');
  return _supabaseAdmin;
}

export function getSupabaseAdminOrNull(): SupabaseClient | null {
  return _supabaseAdmin;
}

export function getStripe(): Stripe {
  if (!_stripe) throw new Error('Stripe not configured (missing STRIPE_SECRET_KEY)');
  return _stripe;
}

export function getResendOrNull(): Resend | null {
  return _resend;
}
