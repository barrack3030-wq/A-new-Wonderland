import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://banggaiwonderland.my.id',
  integrations: [tailwind()],
  // Preserve a useful destination for a legacy package URL found as a 404 in GSC.
  redirects: {
    '/zh/packages/luwuk--salakan-escape/': '/zh/packages/'
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
