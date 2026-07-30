import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

// Único lugar que construye el cliente de Supabase del lado del servidor. Usa @supabase/ssr para
// leer/escribir la cookie de sesión correctamente en Server Components y Server Actions —
// implementar esto a mano es fácil de hacer mal (blueprint.md §11).
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Un Server Component no puede escribir cookies — es seguro ignorarlo aquí porque el
            // middleware/proxy (o la Server Action que sí puede escribir) refresca la sesión.
          }
        },
      },
    },
  );
}
