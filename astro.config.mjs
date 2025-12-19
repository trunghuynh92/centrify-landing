// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://centrify.io',
  output: 'static',
  adapter: vercel({
    isr: {
      // Blog posts will be cached and revalidated on-demand
      bypassToken: process.env.REVALIDATE_SECRET,
      exclude: ['/api/revalidate'],
    },
  }),
  integrations: [sitemap()],
});
