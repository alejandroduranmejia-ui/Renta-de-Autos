import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  connectedAccounts,
  identityVerifications,
  paymentEvents,
  users,
  vehicleDocuments,
  vehicles,
} from "@/lib/db/schema";
import { applyAccountSync } from "@/server/payments/connect";
import { activateVehicleCore } from "@/server/vehicles/service";

// syncConnectedAccountCore() en sí (que sí llama a la API real de Stripe) no se prueba aquí —
// no hay credenciales reales de Stripe en este entorno. `applyAccountSync` es la parte de esa
// función que SÍ es testeable sin red: la escritura en base de datos a partir de datos ya
// obtenidos (blueprint.md §9, paso 10 — nota de "verify before install / not smoke-tested").
describe("stripe connect onboarding", () => {
  const ownerId = "ffffffff-0000-0000-0000-000000000001";
  const vehicleId = "ffffffff-0000-0000-0000-000000000010";
  const stripeAccountId = `acct_test_${Date.now()}`;

  afterAll(async () => {
    await db
      .delete(vehicleDocuments)
      .where(eq(vehicleDocuments.vehicleId, vehicleId));
    await db.delete(vehicles).where(eq(vehicles.id, vehicleId));
    await db
      .delete(connectedAccounts)
      .where(eq(connectedAccounts.ownerId, ownerId));
    await db
      .delete(identityVerifications)
      .where(eq(identityVerifications.userId, ownerId));
    await db.delete(users).where(eq(users.id, ownerId));
  });

  it("blocks activation until the connected account has payouts enabled, then allows it once synced", async () => {
    await db.insert(users).values({
      id: ownerId,
      email: `${ownerId}@test.local`,
      fullName: "Owner",
    });
    await db.insert(identityVerifications).values({
      userId: ownerId,
      documentType: "cedula",
      filePath: "identity/test.jpg",
      status: "approved",
    });
    await db.insert(vehicles).values({
      id: vehicleId,
      ownerId,
      make: "Test",
      model: "Connect",
      year: 2024,
      plate: "CNCT01",
      color: "Azul",
      seats: 4,
      dailyPriceCents: 100_000,
    });
    await db.insert(vehicleDocuments).values([
      {
        vehicleId,
        documentType: "tarjeta_circulacion",
        filePath: "vehicle-docs/test1.jpg",
        status: "approved",
      },
      {
        vehicleId,
        documentType: "poliza_seguro",
        filePath: "vehicle-docs/test2.jpg",
        status: "approved",
      },
    ]);
    await db.insert(connectedAccounts).values({
      ownerId,
      stripeAccountId,
      payoutsEnabled: false,
      verificationStatus: "pending",
    });

    const beforeSync = await activateVehicleCore({ id: ownerId }, vehicleId);
    expect(beforeSync).toEqual({ ok: false, reason: "payouts_not_enabled" });

    await applyAccountSync(stripeAccountId, {
      payoutsEnabled: true,
      detailsSubmitted: true,
    });

    const afterSync = await activateVehicleCore({ id: ownerId }, vehicleId);
    expect(afterSync).toEqual({ ok: true });
  });

  it("does not duplicate a connected account row when the same account.updated event is delivered twice", async () => {
    const eventId = `evt_test_${Date.now()}`;
    await db.insert(paymentEvents).values({
      provider: "stripe",
      externalEventId: eventId,
      type: "account.updated",
      payload: {},
    });

    await expect(
      db.insert(paymentEvents).values({
        provider: "stripe",
        externalEventId: eventId,
        type: "account.updated",
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

    // Y una sola cuenta conectada por dueño, sin importar cuántas veces se sincronice.
    await applyAccountSync(stripeAccountId, {
      payoutsEnabled: true,
      detailsSubmitted: true,
    });
    await applyAccountSync(stripeAccountId, {
      payoutsEnabled: true,
      detailsSubmitted: true,
    });
    const accounts = await db
      .select()
      .from(connectedAccounts)
      .where(eq(connectedAccounts.ownerId, ownerId));
    expect(accounts).toHaveLength(1);
  });
});
