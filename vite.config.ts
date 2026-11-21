import { defineConfig } from "vitest/config";

export default defineConfig({
  server: { port: 3000, host: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "worker/**/*.js"],
      exclude: [
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "worker/**/*.test.ts",
        "src/vite-env.d.ts",
      ],
      reporter: ["text-summary", "text", "lcov"],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 90 },
    },
  },
});
