import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Mismo motivo que en vitest.config.ts: el bundle del blueprint nunca es parte del árbol probado.
  testIgnore: ["**/blueprints/**"],
  timeout: 30000,
  fullyParallel: false, // los tests de concurrencia y de dos-navegadores comparten estado de base de datos
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60000,
  },
});
