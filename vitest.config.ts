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
      enabled: true,
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/tests/**",
        "**/vitest.config.ts",
      ],

      // ✅ Correct way to define thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  esbuild: {
    tsconfigRaw: require("./test.tsconfig.json"),
  },
});
