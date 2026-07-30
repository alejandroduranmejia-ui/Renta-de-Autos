import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookings, users, vehicles } from "@/lib/db/schema";
import {
  cancelBookingCore,
  createBookingCore,
  releaseExpiredHoldsCore,
} from "@/server/bookings/service";

describe("booking concurrency", () => {
  const ownerId = "eeeeeeee-0000-0000-0000-000000000001";
  const renterId = "eeeeeeee-0000-0000-0000-000000000002";
  const vehicleId = "eeeeeeee-0000-0000-0000-000000000010";

  afterAll(async () => {
    await db.delete(bookings).where(eq(bookings.vehicleId, vehicleId));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, renterId));
  });

  it("accepts exactly 1 of 50 concurrent bookings for the same slot and rejects the rest with a conflict", async () => {
    await db.insert(users).values([
      { id: ownerId, email: `${ownerId}@test.local`, fullName: "Owner" },
      { id: renterId, email: `${renterId}@test.local`, fullName: "Renter" },
    ]);
    await db.insert(vehicles).values({
      id: vehicleId,
      ownerId,
      make: "Test",
      model: "Concurrency",
      year: 2024,
      plate: "CONC01",
      color: "Rojo",
      seats: 4,
      dailyPriceCents: 100_000,
      status: "active",
    });

    const startsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 2 * 24 * 60 * 60 * 1000);

    const attempts = Array.from({ length: 50 }, () =>
      createBookingCore({ id: renterId }, { vehicleId, startsAt, endsAt }).then(
        () => "ok" as const,
        () => "conflict" as const,
      ),
    );
    const results = await Promise.all(attempts);

    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect(results.filter((r) => r === "conflict")).toHaveLength(49);

    const rows = await db
      .select()
      .from(bookings)
      .where(eq(bookings.vehicleId, vehicleId));
    expect(rows).toHaveLength(1);
  });

  it("releases an expired held booking so the slot becomes available again", async () => {
    const startsAt = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);

    const held = await createBookingCore(
      { id: renterId },
      { vehicleId, startsAt, endsAt },
    );
    await db
      .update(bookings)
      .set({ holdExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(bookings.id, held.id));

    await releaseExpiredHoldsCore();

    const [reloaded] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, held.id));
    expect(reloaded.status).toBe("cancelled");

    // El slot debe volver a estar libre — otra reserva en el mismo rango ahora sí procede.
    const rebooked = await createBookingCore(
      { id: renterId },
      { vehicleId, startsAt, endsAt },
    );
    expect(rebooked.status).toBe("held");
  });

  it("lets a renter cancel their own booking before it is confirmed, without deleting the row", async () => {
    const startsAt = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
    const created = await createBookingCore(
      { id: renterId },
      { vehicleId, startsAt, endsAt },
    );

    await cancelBookingCore({ id: renterId }, created.id);

    const [reloaded] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, created.id));
    expect(reloaded).toBeDefined();
    expect(reloaded.status).toBe("cancelled");
  });
});
