import type { APIRoute } from 'astro';
import { runOutreachBatch } from '../../../lib/outreach';
import { getSupabaseAdmin } from '../../../lib/env';

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  let companies: string[] = [];

  try {
    const body = await request.json() as { companies?: unknown };
    if (!Array.isArray(body.companies)) {
      return new Response(JSON.stringify({ error: 'companies must be an array of strings' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    companies = (body.companies as unknown[])
      .map((c) => String(c).trim())
      .filter(Boolean);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (companies.length === 0) {
    return new Response(JSON.stringify({ error: 'No companies provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (companies.length > 20) {
    return new Response(JSON.stringify({ error: 'Max 20 companies per batch' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create the batch record synchronously so we can return the ID immediately
  const supabase = getSupabaseAdmin();
  const { data: batch, error: batchError } = await supabase
    .from('outreach_batches')
    .insert({
      status: 'running',
      visitor_count: companies.length,
    })
    .select()
    .single();

  if (batchError || !batch) {
    const message = batchError?.message ?? 'Failed to create batch';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const batchId = batch.id as string;

  // Kick off the pipeline in the background — respond immediately
  const pipeline = runOutreachBatch(companies, batchId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runtime = (locals as unknown as { runtime?: { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } }).runtime;
  const waitUntil = runtime?.ctx?.waitUntil?.bind(runtime.ctx);

  if (waitUntil) {
    waitUntil(pipeline);
  } else {
    // Dev mode fallback — await in process
    await pipeline;
  }

  return new Response(JSON.stringify({ ok: true, batch_id: batchId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
