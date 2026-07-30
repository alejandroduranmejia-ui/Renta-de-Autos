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
    // Los tests de integración comparten UNA base de datos local real (nunca un mock) — sin
    // aislamiento transaccional por test todavía (blueprint.md §13 lo deja como aspiración).
    // Con paralelismo de archivos, dos suites que usan el mismo estado conceptual ("1 vehículo
    // activo") chocan mientras la otra todavía no corrió su limpieza — verificado en vivo:
    // `seed.test.ts` falló de forma intermitente por el fixture de `schema.test.ts` coexistiendo
    // un instante. Correr los archivos en serie lo vuelve determinista.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
