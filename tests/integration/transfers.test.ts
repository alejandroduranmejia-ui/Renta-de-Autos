import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookings, transfers, users, vehicles } from "@/lib/db/schema";
import {
  applyTransferFailure,
  applyTransferSuccess,
} from "@/server/payments/transfers";

// `completeBookingWithTransferCore()` en sí (que sí llama a la API real de Stripe para capturar
// el precio y crear la transferencia) no se prueba aquí — mismo criterio que los pasos 10 y 11.
// `applyTransferSuccess`/`applyTransferFailure` son la parte testeable sin red: la escritura en
// base de datos a partir de un resultado ya conocido (blueprint.md §9, paso 12).
describe("owner transfer on booking completion", () => {
  const ownerId = "cccccccc-0000-0000-0000-000000000001";
  const renterId = "cccccccc-0000-0000-0000-000000000002";
  const vehicleId = "cccccccc-0000-0000-0000-000000000010";
  const successBookingId = "cccccccc-0000-0000-0000-000000000021";
  const failureBookingId = "cccccccc-0000-0000-0000-000000000022";

  afterAll(async () => {
    await db.delete(transfers).where(eq(transfers.bookingId, successBookingId));
    await db.delete(transfers).where(eq(transfers.bookingId, failureBookingId));
    await db.delete(bookings).where(eq(bookings.id, successBookingId));
    await db.delete(bookings).where(eq(bookings.id, failureBookingId));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, renterId));
  });

  it("creates a transfer for exactly price_cents minus commission_cents and completes the booking", async () => {
    await db.insert(users).values([
      { id: ownerId, email: `${ownerId}@test.local`, fullName: "Owner" },
      { id: renterId, email: `${renterId}@test.local`, fullName: "Renter" },
    ]);
    await db.insert(vehicles).values({
      id: vehicleId,
      ownerId,
      make: "Test",
      model: "Transfer",
      year: 2024,
      plate: "TRF001",
      color: "Gris",
      seats: 4,
      dailyPriceCents: 100_000,
      status: "active",
    });
    await db.insert(bookings).values({
      id: successBookingId,
      vehicleId,
      renterId,
      startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "confirmed",
      priceCents: 100_000,
      commissionCents: 20_000,
      depositHoldCents: 100_000,
      currency: "COP",
      timezoneAtBooking: "America/Bogota",
    });

    await applyTransferSuccess(successBookingId, "tr_test_123", 80_000);

    const rows = await db
      .select()
      .from(transfers)
      .where(eq(transfers.bookingId, successBookingId));
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(80_000);
    expect(rows[0].status).toBe("paid");

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, successBookingId));
    expect(booking.status).toBe("completed");
  });

  it("leaves transfers.status='failed' and does not settle the booking when the transfer fails", async () => {
    await db.insert(bookings).values({
      id: failureBookingId,
      vehicleId,
      renterId,
      startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "confirmed",
      priceCents: 100_000,
      commissionCents: 20_000,
      depositHoldCents: 100_000,
      currency: "COP",
      timezoneAtBooking: "America/Bogota",
    });

    await applyTransferFailure(failureBookingId, 80_000);

    const rows = await db
      .select()
      .from(transfers)
      .where(eq(transfers.bookingId, failureBookingId));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("failed");

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, failureBookingId));
    expect(booking.status).toBe("confirmed");
  });
});
