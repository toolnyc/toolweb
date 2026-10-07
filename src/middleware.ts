import { defineMiddleware } from 'astro:middleware';
import { initClients } from './lib/env';
import { getFeatureFlag } from './lib/queries';
import { logEvent } from './lib/logger';

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

  const isApiRoute = pathname.startsWith('/api/');

  if (isApiRoute) {
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
