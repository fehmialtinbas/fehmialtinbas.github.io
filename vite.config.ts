import { defineConfig } from 'vite';

// User site (fehmialtinbas.github.io) is served from the domain root.
export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
