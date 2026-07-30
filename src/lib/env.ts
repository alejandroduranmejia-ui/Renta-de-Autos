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
  // Requeridas desde el paso 10 en adelante (Stripe Connect) — no antes.
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  // Requerida desde el paso 14 en adelante (cron de expiración de holds) — no antes.
  CRON_SECRET: z.string().min(1),
  // Opcional a propósito desde el paso 15: sin una cuenta real de Sentry, el SDK no debe
  // bloquear el build ni el gate — simplemente no reporta nada (blueprint.md regla 11, "nunca
  // depender duro de un servicio de terceros").
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
