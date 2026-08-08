import { type NextRequest, NextResponse } from "next/server";
import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Recibe tanto el callback de OAuth (Google) como el link de confirmación de correo — ambos
// entregan un `code` que se intercambia por una sesión real.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Se valida aunque aquí se concatene tras `origin`: `//sitio.com` produce una URL que algunos
  // navegadores y proxies normalizan a otro host (auditoría del 2026-08-08).
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/iniciar-sesion?error=confirmacion_invalida`,
  );
}
