import { getSupabaseAdmin } from './env';

interface RateLimitConfig {
  /** Max requests allowed within the time window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Endpoint identifier (e.g., 'ai-chat', 'inquiry') */
  endpoint: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Check and record a rate-limited request using Supabase.
 * Survives Cloudflare Workers cold starts (unlike in-memory Maps).
 *
 * Each call inserts a row and counts recent rows for the same IP + endpoint.
 */
export async function checkRateLimit(
  ip: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const supabaseAdmin = getSupabaseAdmin();
  const { maxRequests, windowSeconds, endpoint } = config;

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Count recent requests within the window
  const { count, error: countError } = await supabaseAdmin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart);

  if (countError) {
    // If the rate limit check fails, allow the request but log the error.
    // Better to let a few extra requests through than block everyone.
    console.error('Rate limit check failed:', countError);
    return { allowed: true, remaining: maxRequests };
  }

  const currentCount = count ?? 0;

  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  const { error: insertError } = await supabaseAdmin
    .from('rate_limits')
    .insert({ ip_address: ip, endpoint });

  if (insertError) {
    console.error('Rate limit insert failed:', insertError);
  }

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

/**
 * Clean up old rate limit entries. Call periodically or via cron.
 * Deletes entries older than 2 hours.
 */
export async function cleanupRateLimits(): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('rate_limits')
    .delete()
    .lt('created_at', cutoff);

  if (error) {
    console.error('Rate limit cleanup failed:', error);
  }
}
