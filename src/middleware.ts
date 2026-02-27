import { defineMiddleware } from 'astro:middleware';
import { initClients, getSupabaseAdminOrNull } from './lib/env';
import { getAuthTokens, setAuthCookies, clearAuthCookies } from './lib/cookies';
import { getFeatureFlag } from './lib/queries';

export const onRequest = defineMiddleware(async (context, next) => {
  initClients(context.locals.runtime.env);

  const { pathname } = context.url;

  // Feature flag: block /shop routes when shop is disabled
  if (pathname === '/shop' || pathname.startsWith('/shop/')) {
    const shopEnabled = await getFeatureFlag('shop_enabled');
    if (!shopEnabled) return context.redirect('/');
  }

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isPortalRoute =
    pathname.startsWith('/portal') &&
    pathname !== '/portal' &&
    pathname !== '/portal/verify';

  const { accessToken, refreshToken } = getAuthTokens(context.cookies);
  const supabaseAdmin = getSupabaseAdminOrNull();

  if (!accessToken || !supabaseAdmin) {
    if (isAdminRoute) return context.redirect('/admin/login');
    if (isPortalRoute) return context.redirect('/portal');
    return next();
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      // Try refresh
      if (refreshToken) {
        const { data: refreshData, error: refreshError } =
          await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken });

        if (refreshError || !refreshData.session) {
          clearAuthCookies(context.cookies);
          if (isAdminRoute) return context.redirect('/admin/login');
          if (isPortalRoute) return context.redirect('/portal');
          return next();
        }

        setAuthCookies(
          context.cookies,
          refreshData.session.access_token,
          refreshData.session.refresh_token,
        );
        context.locals.user = refreshData.user ?? undefined;
      } else {
        if (isAdminRoute) return context.redirect('/admin/login');
        if (isPortalRoute) return context.redirect('/portal');
        return next();
      }
    } else {
      context.locals.user = user;
    }

    // For portal routes, also look up the client record
    if (isPortalRoute && context.locals.user) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id, name, email, company, status')
        .eq('auth_user_id', context.locals.user.id)
        .single();

      if (!client) {
        clearAuthCookies(context.cookies);
        return context.redirect('/portal');
      }

      if (client.status === 'inactive') {
        // Could render an "inactive" page instead
        return new Response('Account inactive', { status: 403 });
      }

      context.locals.client = client;
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    if (isAdminRoute) return context.redirect('/admin/login');
    if (isPortalRoute) return context.redirect('/portal');
  }

  return next();
});
