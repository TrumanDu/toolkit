import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        // Bundle ESM-only deps that can't be required() in CJS
        exclude: ['fix-path', 'electron-store', 'conf'],
      }),
    ],
    build: {
      rollupOptions: {
        external: ['source-map-support'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    plugins: [react()],
  },
});
