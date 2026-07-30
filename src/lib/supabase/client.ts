import { createBrowserClient } from "@supabase/ssr";

// Único lugar que construye el cliente de Supabase del lado del navegador — lo usa `ChatThread`
// para la suscripción de Realtime. No reutiliza `@/lib/env`: ese módulo exige variables que solo
// existen en el servidor (STRIPE_SECRET_KEY, DATABASE_URL, ...) y `zod.parse()` fallaría en el
// bundle del navegador, donde `process.env` únicamente trae las `NEXT_PUBLIC_*` inlineadas en
// build. Next.js reemplaza esta referencia literal a `process.env.NEXT_PUBLIC_*` en build time.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
