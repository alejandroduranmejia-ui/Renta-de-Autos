"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
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
