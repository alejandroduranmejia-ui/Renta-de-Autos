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
    // Reutilizar un servidor local ya arriba ahorra tiempo — pero un servidor viejo que quedó
    // corriendo desde una sesión anterior sirve HTML compilado antes de los últimos cambios, y
    // un test que compara contra ese HTML falla (o peor, pasa) por una razón que no tiene nada
    // que ver con el código actual (verificado en vivo: un `next dev` de una prueba anterior
    // seguía en el puerto 3000 y el test de la clase "dark" comparó contra el layout viejo). CI
    // nunca debe reutilizar nada.
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
