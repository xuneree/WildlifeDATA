import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // These client directives are meaningful in RSC builds; this is a browser-only SPA.
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) return;
        warn(warning);
      },
    },
  },
});
