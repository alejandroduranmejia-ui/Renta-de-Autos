import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Herramienta standalone — Next.js no está corriendo cuando drizzle-kit se invoca, así que el
// framework nunca carga .env por nosotros. 'dotenv/config' es el mecanismo explícito de carga
// para esta herramienta (ver blueprint.md §19.6, "Every tool that reads env vars...").
if (!process.env.DIRECT_DATABASE_URL) {
  throw new Error(
    "DIRECT_DATABASE_URL no está definida — copia .env.example a .env.local y complétala.",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL,
  },
});
