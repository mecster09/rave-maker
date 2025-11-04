/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      reporter: ["text", "html", "lcov"],
      all: true,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/tests/**",
        "**/vitest.config.ts",
      ],

      // ✅ Correct way to define thresholds
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
  esbuild: {
    tsconfigRaw: require("./test.tsconfig.json"),
  },
});
