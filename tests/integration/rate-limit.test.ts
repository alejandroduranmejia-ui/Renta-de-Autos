import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/expirar-holds/route";
import { db } from "@/lib/db";
import { bookings, rateLimitEvents, users, vehicles } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { checkAndIncrement } from "@/lib/rate-limit";

describe("rate limiting", () => {
  it("allows exactly the limit and rejects the 11th attempt within the window, with a positive Retry-After", async () => {
    const key = `test-login:${Date.now()}`;
    for (let i = 0; i < 10; i++) {
      const result = await checkAndIncrement(key, 10, 60);
      expect(result.allowed).toBe(true);
    }
    const eleventh = await checkAndIncrement(key, 10, 60);
    expect(eleventh.allowed).toBe(false);
    if (!eleventh.allowed) {
      expect(eleventh.retryAfterSeconds).toBeGreaterThan(0);
    }

    await db.delete(rateLimitEvents).where(eq(rateLimitEvents.key, key));
  });

  it("resets the counter once the window has passed", async () => {
    const key = `test-window:${Date.now()}`;
    const first = await checkAndIncrement(key, 1, 1);
    expect(first.allowed).toBe(true);
    const second = await checkAndIncrement(key, 1, 1);
    expect(second.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const afterWindow = await checkAndIncrement(key, 1, 1);
    expect(afterWindow.allowed).toBe(true);

    await db.delete(rateLimitEvents).where(eq(rateLimitEvents.key, key));
  });
});

describe("cron: expirar-holds", () => {
  const ownerId = "bbbbbbbb-0000-0000-0000-000000000001";
  const renterId = "bbbbbbbb-0000-0000-0000-000000000002";
  const vehicleId = "bbbbbbbb-0000-0000-0000-000000000010";
  const bookingId = "bbbbbbbb-0000-0000-0000-000000000020";

  afterAll(async () => {
    await db.delete(bookings).where(eq(bookings.id, bookingId));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, renterId));
  });

  it("responds 401 and expires nothing without the correct CRON_SECRET", async () => {
    await db.insert(users).values([
      { id: ownerId, email: `${ownerId}@test.local`, fullName: "Owner" },
      { id: renterId, email: `${renterId}@test.local`, fullName: "Renter" },
    ]);
    await db.insert(vehicles).values({
      id: vehicleId,
      ownerId,
      make: "Test",
      model: "Cron",
      year: 2024,
      plate: "CRN001",
      color: "Verde",
      seats: 4,
      dailyPriceCents: 100_000,
      status: "active",
    });
    await db.insert(bookings).values({
      id: bookingId,
      vehicleId,
      renterId,
      startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      status: "held",
      holdExpiresAt: new Date(Date.now() - 1000),
      priceCents: 100_000,
      commissionCents: 20_000,
      depositHoldCents: 100_000,
      currency: "COP",
      timezoneAtBooking: "America/Bogota",
    });

    const response = await GET(
      new Request("http://localhost/api/cron/expirar-holds", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    expect(response.status).toBe(401);

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    expect(booking.status).toBe("held");
  });

  it("cancels an expired held booking and frees the slot with the correct secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/expirar-holds", {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      }),
    );
    expect(response.status).toBe(200);

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    expect(booking.status).toBe("cancelled");
  });
});
