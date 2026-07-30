import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function connectSql() {
  return postgres("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
}

async function loginAs(page: import("@playwright/test").Page, email: string) {
  await page.goto("/iniciar-sesion");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("http://localhost:3000/");
}

test.describe("booking chat", () => {
  test("a message sent from browser A appears in browser B without a reload", async ({
    browser,
  }) => {
    const renterEmail = `e2e-chat-renter-${Date.now()}@test.local`;
    const ownerEmail = `e2e-chat-owner-${Date.now()}@test.local`;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: renterUser } = await admin.auth.admin.createUser({
      email: renterEmail,
      password: "password123",
      email_confirm: true,
    });
    const { data: ownerUser } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: "password123",
      email_confirm: true,
    });
    if (!renterUser.user || !ownerUser.user)
      throw new Error("Failed to create test users");
    const renterId = renterUser.user.id;
    const ownerId = ownerUser.user.id;

    const sql = connectSql();
    await sql`insert into users (id, email, full_name) values (${renterId}, ${renterEmail}, 'E2E Renter')`;
    await sql`insert into users (id, email, full_name) values (${ownerId}, ${ownerEmail}, 'E2E Owner')`;
    const [vehicle] = await sql`
      insert into vehicles (owner_id, make, model, year, plate, color, seats, daily_price_cents, status)
      values (${ownerId}, 'Test', 'Chat', 2024, 'CHT001', 'Rojo', 4, 100000, 'active')
      returning id
    `;
    const [booking] = await sql`
      insert into bookings (vehicle_id, renter_id, starts_at, ends_at, status, price_cents, commission_cents, deposit_hold_cents, currency, timezone_at_booking)
      values (${vehicle.id}, ${renterId}, now() + interval '5 days', now() + interval '6 days', 'confirmed', 100000, 20000, 100000, 'COP', 'America/Bogota')
      returning id
    `;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await loginAs(pageA, renterEmail);
    await pageA.goto(`/reservas/${booking.id}`);

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await loginAs(pageB, ownerEmail);
    await pageB.goto(`/reservas/${booking.id}`);

    const messageText = `Hola desde A ${Date.now()}`;
    await pageA.fill('input[name="body"]', messageText);
    await pageA.click('button[type="submit"]');

    await expect(pageB.getByText(messageText)).toBeVisible({
      timeout: 10000,
    });

    await contextA.close();
    await contextB.close();
    await sql`delete from messages where booking_id = ${booking.id}`;
    await sql`delete from bookings where id = ${booking.id}`;
    await sql`delete from vehicles where id = ${vehicle.id}`;
    await sql`delete from users where id in (${renterId}, ${ownerId})`;
    await sql.end();
    await admin.auth.admin.deleteUser(renterId);
    await admin.auth.admin.deleteUser(ownerId);
  });

  test("a user unrelated to the booking is denied its messages server-side (RLS), not just by the page guard", async () => {
    const renterEmail = `e2e-chat-renter2-${Date.now()}@test.local`;
    const ownerEmail = `e2e-chat-owner2-${Date.now()}@test.local`;
    const strangerEmail = `e2e-chat-stranger-${Date.now()}@test.local`;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: renterUser } = await admin.auth.admin.createUser({
      email: renterEmail,
      password: "password123",
      email_confirm: true,
    });
    const { data: strangerUser } = await admin.auth.admin.createUser({
      email: strangerEmail,
      password: "password123",
      email_confirm: true,
    });
    if (!renterUser.user || !strangerUser.user)
      throw new Error("Failed to create test users");
    const renterId = renterUser.user.id;
    const strangerId = strangerUser.user.id;
    const { data: ownerUser } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: "password123",
      email_confirm: true,
    });
    if (!ownerUser.user) throw new Error("Failed to create owner");
    const ownerId = ownerUser.user.id;

    const sql = connectSql();
    await sql`insert into users (id, email, full_name) values (${renterId}, ${renterEmail}, 'E2E Renter 2')`;
    await sql`insert into users (id, email, full_name) values (${ownerId}, ${ownerEmail}, 'E2E Owner 2')`;
    await sql`insert into users (id, email, full_name) values (${strangerId}, ${strangerEmail}, 'E2E Stranger')`;
    const [vehicle] = await sql`
      insert into vehicles (owner_id, make, model, year, plate, color, seats, daily_price_cents, status)
      values (${ownerId}, 'Test', 'Private', 2024, 'CHT002', 'Azul', 4, 100000, 'active')
      returning id
    `;
    const [booking] = await sql`
      insert into bookings (vehicle_id, renter_id, starts_at, ends_at, status, price_cents, commission_cents, deposit_hold_cents, currency, timezone_at_booking)
      values (${vehicle.id}, ${renterId}, now() + interval '5 days', now() + interval '6 days', 'confirmed', 100000, 20000, 100000, 'COP', 'America/Bogota')
      returning id
    `;
    await sql`
      insert into messages (booking_id, sender_id, body)
      values (${booking.id}, ${renterId}, 'mensaje privado de esta reserva')
    `;

    // El mismo mecanismo (RLS sobre `messages`) que decide qué filas ve un cliente por PostgREST
    // es el que Realtime consulta para autorizar cada evento de Postgres Changes que emite —
    // probarlo por PostgREST verifica la misma frontera server-side sin depender de un socket.
    const stranger = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signInError } = await stranger.auth.signInWithPassword({
      email: strangerEmail,
      password: "password123",
    });
    expect(signInError).toBeNull();

    const { data, error } = await stranger
      .from("messages")
      .select()
      .eq("booking_id", booking.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Control: el propio renter sí ve el mensaje con la misma política.
    const asRenter = createClient(SUPABASE_URL, ANON_KEY);
    await asRenter.auth.signInWithPassword({
      email: renterEmail,
      password: "password123",
    });
    const { data: renterView } = await asRenter
      .from("messages")
      .select()
      .eq("booking_id", booking.id);
    expect(renterView).toHaveLength(1);

    await sql`delete from messages where booking_id = ${booking.id}`;
    await sql`delete from bookings where id = ${booking.id}`;
    await sql`delete from vehicles where id = ${vehicle.id}`;
    await sql`delete from users where id in (${renterId}, ${ownerId}, ${strangerId})`;
    await sql.end();
    await admin.auth.admin.deleteUser(renterId);
    await admin.auth.admin.deleteUser(ownerId);
    await admin.auth.admin.deleteUser(strangerId);
  });
});
