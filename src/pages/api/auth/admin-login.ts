import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../../lib/env';
import { setAuthCookies } from '../../../lib/cookies';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return redirect('/admin/login');
    }

    setAuthCookies(cookies, data.session.access_token, data.session.refresh_token);
    return redirect('/admin');
  } catch {
    return redirect('/admin/login');
  }
};
