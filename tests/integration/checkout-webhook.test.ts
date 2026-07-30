import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { db } from "@/lib/db";
import {
  bookings,
  charges,
  paymentEvents,
  users,
  vehicles,
} from "@/lib/db/schema";
import { applyCheckoutCompletion } from "@/server/payments/checkout";

// `syncCheckoutSessionCore()` en sí (que sí llama a la API real de Stripe para volver a
// consultar la sesión) no se prueba aquí — mismo criterio que `syncConnectedAccountCore` en el
// paso 10. `applyCheckoutCompletion` es la parte testeable sin red: la escritura en base de
// datos a partir de un payment_intent_id ya obtenido (blueprint.md §9, paso 11).
describe("checkout webhook", () => {
  const ownerId = "dddddddd-0000-0000-0000-000000000001";
  const renterId = "dddddddd-0000-0000-0000-000000000002";
  const vehicleId = "dddddddd-0000-0000-0000-000000000010";
  const bookingId = "dddddddd-0000-0000-0000-000000000020";

  afterAll(async () => {
    await db.delete(charges).where(eq(charges.bookingId, bookingId));
    await db.delete(bookings).where(eq(bookings.id, bookingId));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, renterId));
  });

  it("creates exactly 1 charges row and confirms a held, non-expired booking", async () => {
    await db.insert(users).values([
      { id: ownerId, email: `${ownerId}@test.local`, fullName: "Owner" },
      { id: renterId, email: `${renterId}@test.local`, fullName: "Renter" },
    ]);
    await db.insert(vehicles).values({
      id: vehicleId,
      ownerId,
      make: "Test",
      model: "Checkout",
      year: 2024,
      plate: "CHK001",
      color: "Negro",
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
      holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      priceCents: 100_000,
      commissionCents: 20_000,
      depositHoldCents: 100_000,
      currency: "COP",
      timezoneAtBooking: "America/Bogota",
    });

    const result = await applyCheckoutCompletion(bookingId, "pi_test_123");
    expect(result).not.toBeNull();

    const rows = await db
      .select()
      .from(charges)
      .where(eq(charges.bookingId, bookingId));
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(200_000);
    expect(rows[0].status).toBe("requires_capture");

    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    expect(booking.status).toBe("confirmed");
  });

  it("leaves exactly 1 charges row when the same completion is applied twice", async () => {
    const second = await applyCheckoutCompletion(bookingId, "pi_test_123");
    expect(second).toBeNull();

    const rows = await db
      .select()
      .from(charges)
      .where(eq(charges.bookingId, bookingId));
    expect(rows).toHaveLength(1);
  });

  it("leaves exactly 1 payment_events row when the same event id is delivered twice", async () => {
    const eventId = `evt_test_${Date.now()}`;
    await db.insert(paymentEvents).values({
      provider: "stripe",
      externalEventId: eventId,
      type: "checkout.session.completed",
      payload: {},
    });

    await expect(
      db.insert(paymentEvents).values({
        provider: "stripe",
        externalEventId: eventId,
        type: "checkout.session.completed",
        payload: {},
      }),
    ).rejects.toThrow();

    const rows = await db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.externalEventId, eventId));
    expect(rows).toHaveLength(1);

    await db
      .delete(paymentEvents)
      .where(eq(paymentEvents.externalEventId, eventId));
  });

  it("responds 400 and writes nothing when the signature is invalid", async () => {
    const payload = JSON.stringify({
      id: `evt_bad_${Date.now()}`,
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_bad" } },
    });

    const request = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const rows = await db
      .select()
      .from(paymentEvents)
      .where(eq(paymentEvents.type, "checkout.session.completed"));
    // Nada del payload de esta petición pudo haberse escrito — su id es único a esta prueba.
    expect(rows.every((r) => !r.externalEventId.includes("evt_bad_"))).toBe(
      true,
    );
  });
});
