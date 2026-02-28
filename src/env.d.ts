/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    runtime: {
      env: {
        MEDIA_BUCKET: R2Bucket;
        ASSETS: { fetch: (req: Request | string) => Promise<Response> };
        PUBLIC_SUPABASE_URL: string;
        PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: string;
        SUPABASE_SECRET_KEY?: string;
        STRIPE_SECRET_KEY?: string;
        STRIPE_WEBHOOK_SECRET?: string;
        PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
        R2_PUBLIC_URL?: string;
        RESEND_API_KEY?: string;
        PUBLIC_SITE_URL?: string;
        NTFY_TOPIC?: string;
        [key: string]: unknown;
      };
      cf: IncomingRequestCfProperties;
      caches: CacheStorage;
      ctx: ExecutionContext;
    };
    user?: {
      id: string;
      email?: string;
    };
    client?: {
      id: string;
      name: string;
      email: string;
      company?: string;
      status: 'active' | 'inactive';
    };
  }
}

interface ImportMetaEnv {
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
