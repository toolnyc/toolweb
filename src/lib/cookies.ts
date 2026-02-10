import type { AstroCookies } from 'astro';

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
};

export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
) {
  cookies.set('sb-access-token', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24, // 1 day
  });
  cookies.set('sb-refresh-token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookies(cookies: AstroCookies) {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
}

export function getAuthTokens(cookies: AstroCookies) {
  return {
    accessToken: cookies.get('sb-access-token')?.value,
    refreshToken: cookies.get('sb-refresh-token')?.value,
  };
}
