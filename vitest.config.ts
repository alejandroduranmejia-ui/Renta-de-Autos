import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/smoke/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    // El bundle de The Architect vive en blueprints/ dentro de este mismo repo — nunca es parte
    // del árbol de la app, y nunca debe ser recorrido por el test runner.
    exclude: ["node_modules", "blueprints/**", ".next/**", "tests/e2e/**"],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
