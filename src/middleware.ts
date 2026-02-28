import { defineMiddleware } from 'astro:middleware';
import { initClients, getSupabaseAdminOrNull } from './lib/env';
import { getAuthTokens, setAuthCookies, clearAuthCookies } from './lib/cookies';
import { getFeatureFlag } from './lib/queries';
import { setExecutionContext, logError, logEvent } from './lib/logger';

export const onRequest = defineMiddleware(async (context, next) => {
  initClients(context.locals.runtime.env);
  setExecutionContext(context.locals.runtime.ctx);

  const startTime = Date.now();
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
    const response = await next();
    recordAnalytics(context, response, startTime);
    return response;
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
          const response = await next();
          recordAnalytics(context, response, startTime);
          return response;
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
        const response = await next();
        recordAnalytics(context, response, startTime);
        return response;
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
    logError('error', 'Auth middleware error', { path: pathname, error: err });
    if (isAdminRoute) return context.redirect('/admin/login');
    if (isPortalRoute) return context.redirect('/portal');
  }

  const response = await next();
  recordAnalytics(context, response, startTime);
  return response;
});

function recordAnalytics(
  context: Parameters<Parameters<typeof defineMiddleware>[0]>[0],
  response: Response,
  startTime: number,
): void {
  const { pathname } = context.url;

  // Skip static assets and internal routes
  if (pathname.includes('.') || pathname.startsWith('/_')) return;

  const isApi = pathname.startsWith('/api/');
  const cf = context.locals.runtime.cf;

  logEvent(isApi ? 'api_call' : 'page_view', {
    path: pathname,
    method: context.request.method,
    statusCode: response.status,
    durationMs: Date.now() - startTime,
    country: (cf?.country as string) || undefined,
    userAgent: context.request.headers.get('user-agent') || undefined,
  });
}
