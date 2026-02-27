import type { APIRoute } from 'astro';
import { getEnv } from '../../lib/env';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Require admin auth
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Allowed: jpg, png, webp, gif, mp4' }),
        { status: 400 },
      );
    }

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large. Max: ${isVideo ? '100MB' : '10MB'}` }),
        { status: 400 },
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const publicUrl = getEnv().R2_PUBLIC_URL;
    if (!publicUrl) {
      return new Response(JSON.stringify({ error: 'R2_PUBLIC_URL not configured' }), {
        status: 500,
      });
    }

    // Check for Cloudflare R2 binding (available in Cloudflare Pages runtime)
    const bucket = locals.runtime?.env?.MEDIA_BUCKET;

    if (bucket) {
      // Production path: upload via R2 binding
      await bucket.put(filename, file.stream() as ReadableStream, {
        httpMetadata: { contentType: file.type },
      });

      const url = `${publicUrl}/${filename}`;

      return new Response(
        JSON.stringify({
          url,
          filename,
          size: file.size,
          type: file.type,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Dev fallback: R2 binding not available (local dev without wrangler)
    console.warn('[upload] MEDIA_BUCKET binding missing — file NOT stored. Running in local dev mode.');

    return new Response(
      JSON.stringify({
        error: 'File storage not available. Uploads require Cloudflare Pages runtime (R2 binding).',
        dev: true,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[upload] Error:', err, {
      url: request.url,
      user: locals.user?.email ?? 'unknown',
    });
    return new Response(JSON.stringify({ error: 'Upload failed' }), { status: 500 });
  }
};
