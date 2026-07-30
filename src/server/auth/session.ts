import { createSupabaseServerClient } from "@/lib/supabase/server";

// Lectura ligera de la sesión — para mostrar el nombre del usuario en la UI, no para decidir
// autorización. requireUser() (guards.ts) es la única verificación que de verdad cuenta.
export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { user } : null;
}
