// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://tool.nyc',
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    tailwind(),
    sitemap({
      filter: (page) =>
        !page.startsWith('https://tool.nyc/admin') &&
        !page.startsWith('https://tool.nyc/api') &&
        !page.startsWith('https://tool.nyc/portal'),
    }),
  ],
});
