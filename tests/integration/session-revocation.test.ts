import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { env } from "@/lib/env";

// Prueba el mecanismo real de "cerrar sesión en todos los dispositivos" contra el propio
// servidor de Auth — no contra dos navegadores reales, porque el access token ya emitido no se
// invalida de forma retroactiva (es un JWT firmado, sin lista de revocación consultada en cada
// request); la garantía real y verificable es sobre el refresh token (ver blueprint.md §9, paso 4).
describe("session revocation", () => {
  const email = `revocation-${Date.now()}@test.local`;
  let userId: string | undefined;

  afterAll(async () => {
    if (userId) {
      const admin = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
      );
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("revokes the other session's refresh token on global sign-out", async () => {
    const admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
    );
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: "password123",
        email_confirm: true,
      });
    expect(createErr).toBeNull();
    userId = created.user?.id;

    const clientA = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    const clientB = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );

    const signInA = await clientA.auth.signInWithPassword({
      email,
      password: "password123",
    });
    const signInB = await clientB.auth.signInWithPassword({
      email,
      password: "password123",
    });
    expect(signInA.data.session).not.toBeNull();
    expect(signInB.data.session).not.toBeNull();

    const refreshTokenB = signInB.data.session?.refresh_token as string;

    const signOutResult = await clientA.auth.signOut({ scope: "global" });
    expect(signOutResult.error).toBeNull();

    const clientB2 = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
    const refreshResult = await clientB2.auth.refreshSession({
      refresh_token: refreshTokenB,
    });

    expect(refreshResult.error).not.toBeNull();
    expect(refreshResult.data.session).toBeNull();
  });
});
