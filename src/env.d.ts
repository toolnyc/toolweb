/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
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
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_KEY: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly PUBLIC_STRIPE_PUBLISHABLE_KEY: string;
  readonly R2_ACCOUNT_ID: string;
  readonly R2_ACCESS_KEY_ID: string;
  readonly R2_SECRET_ACCESS_KEY: string;
  readonly R2_BUCKET_NAME: string;
  readonly R2_PUBLIC_URL: string;
  readonly RESEND_API_KEY: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
