import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookings, users, vehicles } from "@/lib/db/schema";

const FIXTURE_OWNER_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const FIXTURE_RENTER_ID = "aaaaaaaa-0000-0000-0000-000000000002";
const FIXTURE_VEHICLE_ID = "aaaaaaaa-0000-0000-0000-000000000003";

const EXPECTED_TABLES = [
  "audit_log",
  "availability_exceptions",
  "availability_rules",
  "bookings",
  "charges",
  "connected_accounts",
  "identity_verifications",
  "messages",
  "payment_events",
  "rate_limit_events",
  "transfers",
  "users",
  "vehicle_documents",
  "vehicle_photos",
  "vehicles",
];

describe("schema", () => {
  it("creates every table defined in blueprint.md §4", async () => {
    const rows = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const names = new Set(rows.map((r) => r.table_name));
    for (const table of EXPECTED_TABLES) {
      expect(names.has(table), `missing table: ${table}`).toBe(true);
    }
  });

  afterAll(async () => {
    // Este proyecto todavía no envuelve cada test en una transacción con rollback (§13) — hasta
    // que eso exista, la limpieza explícita es lo que mantiene los tests re-ejecutables.
    await db
      .delete(bookings)
      .where(sql`${bookings.vehicleId} = ${FIXTURE_VEHICLE_ID}`);
    await db
      .delete(vehicles)
      .where(sql`${vehicles.id} = ${FIXTURE_VEHICLE_ID}`);
    await db
      .delete(users)
      .where(sql`${users.id} in (${FIXTURE_OWNER_ID}, ${FIXTURE_RENTER_ID})`);
  });

  it("rejects an overlapping booking via the exclusion constraint", async () => {
    const ownerId = FIXTURE_OWNER_ID;
    const renterId = FIXTURE_RENTER_ID;
    const vehicleId = FIXTURE_VEHICLE_ID;

    await db.insert(users).values([
      {
        id: ownerId,
        email: `owner-${vehicleId}@test.local`,
        fullName: "Owner",
      },
      {
        id: renterId,
        email: `renter-${vehicleId}@test.local`,
        fullName: "Renter",
      },
    ]);
    await db.insert(vehicles).values({
      id: vehicleId,
      ownerId,
      make: "Test",
      model: "Test",
      year: 2024,
      plate: "TEST01",
      color: "Azul",
      seats: 4,
      dailyPriceCents: 50_000,
      status: "active",
    });
    await db.insert(bookings).values({
      vehicleId,
      renterId,
      startsAt: new Date("2026-09-01T10:00:00Z"),
      endsAt: new Date("2026-09-03T10:00:00Z"),
      status: "confirmed",
      priceCents: 100_000,
      commissionCents: 10_000,
      depositHoldCents: 50_000,
      currency: "COP",
      timezoneAtBooking: "America/Bogota",
    });

    // Drizzle envuelve el error real de postgres.js: el mensaje de nivel superior es genérico
    // ("Failed query: ..."), y el código/constraint real vive en `error.cause` — verificado en
    // vivo contra el driver pinneado en §11. 23P01 es el SQLSTATE de exclusion_violation.
    let thrown:
      | (Error & { cause?: { code?: string; constraint_name?: string } })
      | undefined;
    try {
      await db.insert(bookings).values({
        vehicleId,
        renterId,
        startsAt: new Date("2026-09-02T10:00:00Z"),
        endsAt: new Date("2026-09-04T10:00:00Z"),
        status: "held",
        priceCents: 100_000,
        commissionCents: 10_000,
        depositHoldCents: 50_000,
        currency: "COP",
        timezoneAtBooking: "America/Bogota",
      });
    } catch (err) {
      thrown = err as typeof thrown;
    }
    expect(thrown?.cause?.code).toBe("23P01");
    expect(thrown?.cause?.constraint_name).toBe("excl_bookings_no_overlap");

    const rows = await db
      .select()
      .from(bookings)
      .where(sql`${bookings.vehicleId} = ${vehicleId}`);
    expect(rows).toHaveLength(1);
  });
});
