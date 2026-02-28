import { getSupabaseAdminOrNull } from './env';
import { sendPushNotification } from './notify';

type LogLevel = 'critical' | 'error' | 'warn';

interface LogContext {
  path?: string;
  [key: string]: unknown;
}

/**
 * Fire-and-forget: enqueue via waitUntil so it never blocks the response.
 * Falls back to unawaited promise if no ExecutionContext is available.
 */
function enqueue(ctx: ExecutionContext | null, fn: () => Promise<void>): void {
  const promise = fn().catch(() => {});
  if (ctx) {
    ctx.waitUntil(promise);
  }
}

// Per-request context stored via AsyncLocalStorage-style approach.
// Middleware sets this at the start of each request.
let _ctx: ExecutionContext | null = null;

export function setExecutionContext(ctx: ExecutionContext): void {
  _ctx = ctx;
}

function getCtx(): ExecutionContext | null {
  return _ctx;
}

export function logError(
  level: LogLevel,
  message: string,
  context: LogContext = {},
): void {
  // Always log to console as baseline
  const tag = `[${level}]`;
  if (level === 'warn') {
    console.warn(tag, message, context);
  } else {
    console.error(tag, message, context);
  }

  const ctx = getCtx();

  enqueue(ctx, async () => {
    const supabase = getSupabaseAdminOrNull();
    if (!supabase) return;

    // Extract stack from context if it's an Error
    let stack: string | undefined;
    let dbContext = context;
    if (context.error instanceof Error) {
      stack = context.error.stack;
      dbContext = { ...context, error: context.error.message };
    }

    await supabase.from('error_logs').insert({
      level,
      message,
      context: dbContext,
      stack,
      path: dbContext.path,
    });

    // Push notification for critical errors
    if (level === 'critical') {
      const body = dbContext.path
        ? `${message} (${dbContext.path})`
        : message;
      await sendPushNotification('Critical Error', body, 'urgent');
    }
  });
}

export function logEvent(
  eventType: 'page_view' | 'api_call',
  details: {
    path: string;
    method?: string;
    statusCode?: number;
    durationMs?: number;
    country?: string;
    userAgent?: string;
  },
): void {
  const ctx = getCtx();

  enqueue(ctx, async () => {
    const supabase = getSupabaseAdminOrNull();
    if (!supabase) return;

    await supabase.from('analytics_events').insert({
      event_type: eventType,
      path: details.path,
      method: details.method || 'GET',
      status_code: details.statusCode,
      duration_ms: details.durationMs,
      country: details.country,
      user_agent: details.userAgent?.slice(0, 512),
    });
  });
}
