import { z } from "zod";

// Parseado una sola vez al importar este módulo — nunca leer process.env directamente
// en otro archivo. Las variables requeridas desde un paso posterior (DATABASE_URL desde
// el paso 3, STRIPE_SECRET_KEY desde el paso 10, etc.) se vuelven `.min(1)` obligatorias
// en el paso que las necesita, no antes — así el gate de este paso nunca falla por una
// variable que ningún código todavía usa (blueprint.md §9, regla 9).
const envSchema = z.object({
  // Requeridas desde el paso 3 en adelante (esquema de base de datos) — no antes.
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1),
  // Requeridas desde el paso 4 en adelante (autenticación) — no antes.
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
