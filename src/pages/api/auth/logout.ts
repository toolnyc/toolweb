import type { APIRoute } from 'astro';
import { clearAuthCookies } from '../../../lib/cookies';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  clearAuthCookies(cookies);
  return redirect('/');
};
