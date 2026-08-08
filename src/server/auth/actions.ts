"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAndIncrement } from "@/lib/rate-limit";
import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Dos esquemas a propósito. El de INICIO DE SESIÓN no puede endurecerse: si exigiera más
// caracteres que los que tenía la cuenta al crearse, dejaría fuera a los usuarios existentes de
// su propia cuenta. La longitud mínima solo tiene sentido al REGISTRARSE, que es cuando de verdad
// se elige la contraseña (auditoría del 2026-08-08).
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

// 10 caracteres para una plataforma que custodia cédulas, pólizas y medios de pago. Sin reglas de
// composición (mayúsculas/símbolos): la guía actual del NIST las desaconseja porque empujan a
// contraseñas cortas y predecibles.
const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  fullName: z.string().min(1).optional(),
  next: z.string().optional(),
});

async function originFromHeaders() {
  const headersList = await headers();
  const host = headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// Sin IP real de cliente detrás de un proxy (dev local), cae a una clave compartida — en
// producción, Vercel siempre entrega `x-forwarded-for` (blueprint.md §14).
async function clientIp() {
  const headersList = await headers();
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signInWithPasswordAction(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: safeNextPath(formData.get("next")),
  });
  if (!parsed.success) {
    redirect(
      `/iniciar-sesion?error=datos_invalidos&next=${encodeURIComponent(safeNextPath(formData.get("next")))}`,
    );
  }

  // Server Actions no exponen un código de estado HTTP propio (siempre viajan en el protocolo de
  // acciones de Next.js) — el límite de tasa se aplica igual con el mismo mecanismo
  // (`checkAndIncrement`, testeado en tests/integration/rate-limit.test.ts) y se comunica con la
  // misma convención de error+redirect que el resto de esta acción (blueprint.md §14).
  const ip = await clientIp();
  const limit = await checkAndIncrement(`login:${ip}`, 10, 60);
  if (!limit.allowed) {
    redirect(
      `/iniciar-sesion?error=demasiados_intentos&next=${encodeURIComponent(safeNextPath(parsed.data.next))}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirect(
      `/iniciar-sesion?error=credenciales_invalidas&next=${encodeURIComponent(safeNextPath(parsed.data.next))}`,
    );
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signUpWithPasswordAction(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    next: safeNextPath(formData.get("next")),
  });
  if (!parsed.success) {
    redirect("/registro?error=datos_invalidos");
  }

  const ip = await clientIp();
  const limit = await checkAndIncrement(`registro:${ip}`, 5, 60);
  if (!limit.allowed) {
    redirect("/registro?error=demasiados_intentos");
  }

  const supabase = await createSupabaseServerClient();
  const origin = await originFromHeaders();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNextPath(parsed.data.next))}`,
    },
  });

  if (error) {
    redirect("/registro?error=no_se_pudo_registrar");
  }

  redirect("/registro?revisa_tu_correo=1");
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const origin = await originFromHeaders();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/iniciar-sesion?error=google_no_disponible");
  }

  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/iniciar-sesion");
}
