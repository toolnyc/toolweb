import type { APIRoute } from 'astro';
import { getSupabaseAdmin } from '../../lib/env';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const { portfolio_item_id, media_url, caption, sort_order } = body;

    if (!portfolio_item_id || !media_url) {
      return new Response(
        JSON.stringify({ error: 'portfolio_item_id and media_url are required' }),
        { status: 400 },
      );
    }

    const { data, error } = await getSupabaseAdmin()
      .from('case_study_images')
      .insert({
        portfolio_item_id,
        media_url,
        caption: caption || null,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[case-study-images] Insert failed:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[case-study-images] POST error:', err);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const { id, caption, sort_order } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (caption !== undefined) updates.caption = caption || null;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No fields to update' }), { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('case_study_images')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[case-study-images] Update failed:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[case-study-images] PATCH error:', err);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'id query param is required' }), { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from('case_study_images')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[case-study-images] Delete failed:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[case-study-images] DELETE error:', err);
    return new Response(JSON.stringify({ error: 'Delete failed' }), { status: 500 });
  }
};
