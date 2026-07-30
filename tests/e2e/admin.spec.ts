import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

function connectSql() {
  return postgres("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
}

test.describe("admin", () => {
  test("a non-admin visiting /admin gets a 404", async ({ page }) => {
    const email = `e2e-nonadmin-${Date.now()}@test.local`;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
    });

    await page.goto("/iniciar-sesion");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("http://localhost:3000/");

    const response = await page.request.get("/admin/verificaciones");
    expect(response.status()).toBe(404);

    await admin.auth.admin.deleteUser(created.user?.id as string);
  });

  test("an admin approves an identity verification and it disappears from the queue without a manual reload", async ({
    page,
  }) => {
    const adminEmail = `e2e-admin-${Date.now()}@test.local`;
    const subjectEmail = `e2e-subject-${Date.now()}@test.local`;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: adminUser } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: "password123",
      email_confirm: true,
    });
    const { data: subjectUser } = await admin.auth.admin.createUser({
      email: subjectEmail,
      password: "password123",
      email_confirm: true,
    });
    if (!adminUser.user || !subjectUser.user)
      throw new Error("Failed to create test users");
    const adminId = adminUser.user.id;
    const subjectId = subjectUser.user.id;

    const sql = connectSql();
    await sql`insert into users (id, email, full_name, is_admin) values (${adminId}, ${adminEmail}, 'E2E Admin', true)`;
    await sql`insert into users (id, email, full_name) values (${subjectId}, ${subjectEmail}, 'E2E Subject')`;
    const [verification] = await sql`
      insert into identity_verifications (user_id, document_type, file_path, status)
      values (${subjectId}, 'cedula', 'identity/e2e-test.jpg', 'pending')
      returning id
    `;

    await page.goto("/iniciar-sesion");
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("http://localhost:3000/");

    await page.goto("/admin/verificaciones");
    await expect(page.getByText(subjectEmail)).toBeVisible();

    await page
      .locator("li", { hasText: subjectEmail })
      .getByRole("button", { name: "Aprobar" })
      .click();

    await expect(page.getByText(subjectEmail)).not.toBeVisible();

    const [reloaded] =
      await sql`select status from identity_verifications where id = ${verification.id}`;
    expect(reloaded.status).toBe("approved");

    await sql`delete from identity_verifications where id = ${verification.id}`;
    // La aprobación escribió una fila en audit_log referenciando al admin — hay que borrarla antes
    // de poder borrar el usuario, o la llave foránea lo rechaza (correctamente).
    await sql`delete from audit_log where actor_id in (${adminId}, ${subjectId})`;
    await sql`delete from users where id in (${adminId}, ${subjectId})`;
    await sql.end();
    await admin.auth.admin.deleteUser(adminId);
    await admin.auth.admin.deleteUser(subjectId);
  });
});
