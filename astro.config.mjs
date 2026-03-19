// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://kultalaskuri.fi',
  output: 'static',
  
  integrations: [
    react(), 
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});