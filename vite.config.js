import { defineConfig } from 'vite';

// Production build for GitHub Pages (served from /Claymates-Animated-Characters/).
// Relative base keeps the build working at any sub-path, including ?embed iframes.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 700,
    assetsInlineLimit: 4096,
    rollupOptions: {
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
});
