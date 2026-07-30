import { expect, test } from "@playwright/test";

const MAILPIT_URL = "http://127.0.0.1:54324";

async function getConfirmationLink(
  request: import("@playwright/test").APIRequestContext,
  email: string,
) {
  const list = await (
    await request.get(`${MAILPIT_URL}/api/v1/messages`)
  ).json();
  const match = list.messages.find((m: { To: { Address: string }[] }) =>
    m.To.some((to) => to.Address === email),
  );
  if (!match) throw new Error(`No confirmation email found for ${email}`);
  const full = await (
    await request.get(`${MAILPIT_URL}/api/v1/message/${match.ID}`)
  ).json();
  const linkMatch = (full.Text as string).match(/http:\/\/\S+verify\?\S+/);
  if (!linkMatch) throw new Error("No confirmation link found in email body");
  return linkMatch[0];
}

test.describe("auth", () => {
  test("redirects an anonymous request to a protected route to sign-in, with a next param", async ({
    page,
  }) => {
    await page.goto("/mis-reservas");
    await expect(page).toHaveURL(/\/iniciar-sesion\?next=%2Fmis-reservas/);
  });

  test("signup creates a session after email confirmation, and provisions the local user row without a webhook", async ({
    page,
    request,
  }) => {
    const email = `e2e-signup-${Date.now()}@test.local`;

    await page.goto("/registro");
    await page.fill('input[name="fullName"]', "Usuario de Prueba E2E");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/revisa_tu_correo=1/);

    // Espera a que Mailpit reciba el correo (SMTP local, no hay red externa de por medio).
    let link: string | undefined;
    for (let attempt = 0; attempt < 10 && !link; attempt++) {
      try {
        link = await getConfirmationLink(request, email);
      } catch {
        await page.waitForTimeout(300);
      }
    }
    if (!link) throw new Error("La confirmación nunca llegó a Mailpit");

    await page.goto(link);
    // El link de confirmación de GoTrue redirige de vuelta a la app ya con sesión iniciada.
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\//);

    // La primera request autenticada aprovisiona la fila local — visitar una ruta protegida
    // la dispara sin depender de ningún webhook.
    await page.goto("/mis-reservas");
    await expect(page).toHaveURL(/\/mis-reservas$/);
  });
});
