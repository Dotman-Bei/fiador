import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/**
 * Two static pages, no server: `/` (landing) and `/app/` (the board). Any static host serves dist/ as-is.
 * `base: './'` keeps every asset URL relative, so dist/ also works from a subpath (GitHub Pages at /fiador/).
 */
export default defineConfig({
  root: here('.'),
  base: './',
  plugins: [react()],
  build: {
    outDir: here('../dist'),
    emptyOutDir: true,
    rolldownOptions: {
      input: { main: here('./index.html'), app: here('./app/index.html') },
    },
  },
});
