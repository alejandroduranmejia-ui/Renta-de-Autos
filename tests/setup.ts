import "dotenv/config";

// Vitest corre fuera del ciclo de arranque de Next.js, así que ningún .env se carga
// automáticamente para los tests. Este archivo es el mecanismo de carga explícito
// (blueprint.md §19.6, "Every tool that reads env vars must be given a way to load them"),
// referenciado por `setupFiles` en vitest.config.ts.
