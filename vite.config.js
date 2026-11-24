import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Production build for GitHub Pages, served from /Claymates-Animated-Characters/.
// The build uses an absolute base: GitHub serves 404.html for any missing address, including
// nested ones (/Claymates-Animated-Characters/a/b), where relative asset paths would break.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Claymates-Animated-Characters/' : '/',
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 700,
    assetsInlineLimit: 4096,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        notFound: resolve(__dirname, '404.html'),
      },
      output: {
        // three.js changes rarely: its own chunk stays cached between site updates
        manualChunks: { three: ['three'] },
      },
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
}));
