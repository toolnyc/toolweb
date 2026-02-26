import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/env';
import { setAuthCookies } from '../../../lib/cookies';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as 'magiclink' | 'email' | undefined;

  if (!token_hash) {
    return redirect('/portal?error=invalid');
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin.auth.verifyOtp({
    token_hash,
    type: type || 'magiclink',
  });

  if (error || !data.session) {
    return redirect('/portal?error=expired');
  }

  setAuthCookies(cookies, data.session.access_token, data.session.refresh_token);
  return redirect('/portal/dashboard');
};
