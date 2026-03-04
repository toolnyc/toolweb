import { defineMiddleware } from 'astro:middleware';
import { initClients, getSupabaseAdminOrNull } from './lib/env';
import { getAuthTokens, setAuthCookies, clearAuthCookies } from './lib/cookies';
import { getFeatureFlag } from './lib/queries';
import { logError, logEvent } from './lib/logger';

export const onRequest = defineMiddleware(async (context, next) => {
  initClients(context.locals.runtime.env);
  const ctx = context.locals.runtime.ctx;

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

  const isApiRoute = pathname.startsWith('/api/');
  const isAuthPage = pathname === '/admin/login' || pathname === '/portal' || pathname === '/portal/verify';

  // Public API routes that never need auth
  const isPublicApi = isApiRoute && (
    pathname === '/api/stripe-webhook' ||
    pathname === '/api/inquiry' ||
    pathname === '/api/checkout' ||
    pathname === '/api/ai-chat' ||
    pathname === '/api/upload-check' ||
    pathname === '/api/telegram-webhook' ||
    pathname.startsWith('/api/auth/')
  );

  // Routes that need auth: admin pages, portal pages, and non-public API routes
  const needsAuth = isAdminRoute || isPortalRoute || (isApiRoute && !isPublicApi);

  if (!needsAuth) {
    if (isPublicApi || isAuthPage) {
      const response = await next();
      recordAnalytics(context, response, startTime, ctx);
      return response;
    }
    // Public pages: CDN caches 10s + 30s SWR (max 40s stale at edge).
    // Browser caches 60s + 60s SWR (performance for repeat visits).
    // /work/* excluded from CDN cache so draft→published changes appear immediately.
    const response = await next();
    if (!pathname.startsWith('/work/')) {
      response.headers.set('CDN-Cache-Control', 'public, max-age=10, stale-while-revalidate=30');
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=60');
    } else {
      response.headers.set('CDN-Cache-Control', 'no-store');
    }
    recordAnalytics(context, response, startTime, ctx);
    return response;
  }

  const { accessToken, refreshToken } = getAuthTokens(context.cookies);
  const supabaseAdmin = getSupabaseAdminOrNull();

  if (!accessToken || !supabaseAdmin) {
    if (isApiRoute) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (isAdminRoute) return context.redirect('/admin/login');
    return context.redirect('/portal');
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
          if (isApiRoute) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
          if (isAdminRoute) return context.redirect('/admin/login');
          return context.redirect('/portal');
        }

        setAuthCookies(
          context.cookies,
          refreshData.session.access_token,
          refreshData.session.refresh_token,
        );
        context.locals.user = refreshData.user ?? undefined;
      } else {
        if (isApiRoute) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        if (isAdminRoute) return context.redirect('/admin/login');
        return context.redirect('/portal');
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
        return new Response('Account inactive', { status: 403 });
      }

      context.locals.client = client;
    }
  } catch (err) {
    logError('error', 'Auth middleware error', { path: pathname, error: err }, ctx);
    if (isApiRoute) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (isAdminRoute) return context.redirect('/admin/login');
    return context.redirect('/portal');
  }

  const response = await next();
  // Prevent all caching on admin/portal SSR pages
  // (Cloudflare Pages _headers only covers static assets, not Functions)
  if (isAdminRoute || isPortalRoute) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
  }
  recordAnalytics(context, response, startTime, ctx);
  return response;
});

function recordAnalytics(
  context: Parameters<Parameters<typeof defineMiddleware>[0]>[0],
  response: Response,
  startTime: number,
  execCtx: ExecutionContext,
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
  }, execCtx);
}
