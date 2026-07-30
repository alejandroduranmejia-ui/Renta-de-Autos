import { config } from "dotenv";

// Vitest corre fuera del ciclo de arranque de Next.js, así que ningún .env se carga
// automáticamente para los tests. Este archivo es el mecanismo de carga explícito
// (blueprint.md §19.6, "Every tool that reads env vars must be given a way to load them"),
// referenciado por `setupFiles` en vitest.config.ts.
//
// `dotenv/config` por sí solo SOLO carga `.env`, nunca `.env.local` — verificado en vivo contra
// drizzle-kit, donde ese bug real impedía ver DIRECT_DATABASE_URL. Misma corrección aquí.
config({ path: ".env.local" });
