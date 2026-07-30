import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// La única verificación de identidad que cuenta. getUser() (no getSession()) revalida el token
// contra el servidor de Auth de Supabase en cada llamada — getSession() solo decodifica la cookie
// local y no detectaría una sesión revocada por "cerrar sesión en todos los dispositivos".
export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/";
    redirect(`/iniciar-sesion?next=${encodeURIComponent(pathname)}`);
  }

  // Aprovisionamiento just-in-time: si no hay fila local para este id, se crea aquí — el webhook
  // de Supabase (si existe) es un atajo, nunca la única garantía (blueprint.md §8).
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (existing) {
    return existing;
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "Usuario";

  const [created] = await db
    .insert(users)
    .values({
      id: user.id,
      email: user.email ?? "",
      fullName,
      avatarUrl: user.user_metadata?.avatar_url as string | undefined,
    })
    .returning();

  return created;
}

export async function requireAdmin() {
  const actor = await requireUser();
  if (!actor.isAdmin) {
    // 404, nunca 403 — no confirmar que /admin existe a alguien sin permiso (blueprint.md §8).
    notFound();
  }
  return actor;
}
