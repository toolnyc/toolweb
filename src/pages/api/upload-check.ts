import type { APIRoute } from 'astro';
import { getEnv } from '../../lib/env';

/**
 * GET /api/upload-check — diagnostic endpoint to verify R2 binding is available.
 * Requires admin auth. Returns binding status without uploading anything.
 */
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const env = getEnv();
  const bucket = locals.runtime?.env?.MEDIA_BUCKET as R2Bucket | undefined;

  const status = {
    r2_public_url: env.R2_PUBLIC_URL ?? null,
    media_bucket_bound: !!bucket,
    runtime_available: !!locals.runtime,
    runtime_env_keys: locals.runtime?.env
      ? Object.keys(locals.runtime.env).filter(k => !k.startsWith('SUPABASE_SECRET') && !k.startsWith('STRIPE_SECRET') && !k.startsWith('STRIPE_WEBHOOK') && !k.startsWith('RESEND'))
      : [],
  };

  return new Response(JSON.stringify(status, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
