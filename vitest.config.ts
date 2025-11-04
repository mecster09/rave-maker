/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
  esbuild: {
    tsconfigRaw: require('./test.tsconfig.json'),
  },
});
