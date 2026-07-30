"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAndIncrement } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    redirect(
      `/iniciar-sesion?error=datos_invalidos&next=${encodeURIComponent((formData.get("next") as string) || "/")}`,
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
      `/iniciar-sesion?error=demasiados_intentos&next=${encodeURIComponent(parsed.data.next || "/")}`,
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    redirect(
      `/iniciar-sesion?error=credenciales_invalidas&next=${encodeURIComponent(parsed.data.next || "/")}`,
    );
  }

  redirect(parsed.data.next || "/");
}

export async function signUpWithPasswordAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    next: formData.get("next") ?? undefined,
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
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(parsed.data.next || "/")}`,
    },
  });

  if (error) {
    redirect("/registro?error=no_se_pudo_registrar");
  }

  redirect("/registro?revisa_tu_correo=1");
}

export async function signInWithGoogleAction(formData: FormData) {
  const next = (formData.get("next") as string) || "/";
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
