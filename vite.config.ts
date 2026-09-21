/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Deliberately minimal: this application is static HTML + CSS + TypeScript with
// no framework runtime, so no plugins or aliases are required.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    // Business-logic tests run in Node; DOM tests opt in per-file with
    // `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    restoreMocks: true,
  },
});
