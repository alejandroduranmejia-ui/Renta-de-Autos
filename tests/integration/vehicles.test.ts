import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  identityVerifications,
  users,
  vehiclePhotos,
  vehicles,
} from "@/lib/db/schema";
import { NotFoundError } from "@/server/errors";
import {
  activateVehicleCore,
  createVehicleCore,
  deactivateVehicleCore,
  MIN_PHOTOS_TO_ACTIVATE,
  updateVehicleCore,
} from "@/server/vehicles/service";

describe("vehicle CRUD", () => {
  const ownerId = "dddddddd-0000-0000-0000-000000000001";
  const otherId = "dddddddd-0000-0000-0000-000000000002";

  afterAll(async () => {
    await db.delete(vehicles).where(eq(vehicles.ownerId, ownerId));
    await db.delete(users).where(eq(users.id, ownerId));
    await db.delete(users).where(eq(users.id, otherId));
  });

  it("rejects activation without approved identity and keeps status pending_review", async () => {
    await db.insert(users).values({
      id: ownerId,
      email: `${ownerId}@test.local`,
      fullName: "Owner",
    });

    const created = await createVehicleCore(
      { id: ownerId },
      {
        make: "Toyota",
        model: "Corolla",
        year: 2022,
        plate: "TST001",
        color: "Blanco",
        seats: 5,
        dailyPriceCents: 90_000,
      },
    );
    expect(created.status).toBe("pending_review");

    const result = await activateVehicleCore({ id: ownerId }, created.id);
    expect(result).toEqual({ ok: false, reason: "identity_not_approved" });

    const [reloaded] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, created.id));
    expect(reloaded.status).toBe("pending_review");
  });

  it("bloquea la activación por fotos faltantes, una vez aprobada la identidad", async () => {
    // El orden importa: `activateVehicleCore` evalúa identidad primero, así que este caso solo
    // se alcanza con la identidad ya aprobada.
    await db.insert(identityVerifications).values({
      userId: ownerId,
      documentType: "cedula",
      filePath: "private/test-cedula.jpg",
      status: "approved",
    });

    const created = await createVehicleCore(
      { id: ownerId },
      {
        make: "Kia",
        model: "Picanto",
        year: 2021,
        plate: "TST002",
        color: "Rojo",
        seats: 4,
        dailyPriceCents: 70_000,
      },
    );

    const withoutPhotos = await activateVehicleCore(
      { id: ownerId },
      created.id,
    );
    expect(withoutPhotos).toEqual({ ok: false, reason: "photos_missing" });

    // Con una menos del mínimo sigue bloqueado.
    await db.insert(vehiclePhotos).values(
      Array.from({ length: MIN_PHOTOS_TO_ACTIVATE - 1 }, (_, index) => ({
        vehicleId: created.id,
        storagePath: `${created.id}/test-${index}.jpg`,
        position: index,
      })),
    );
    const stillShort = await activateVehicleCore({ id: ownerId }, created.id);
    expect(stillShort).toEqual({ ok: false, reason: "photos_missing" });

    // Con el mínimo, el bloqueo pasa a ser el siguiente de la cadena, no las fotos.
    await db.insert(vehiclePhotos).values({
      vehicleId: created.id,
      storagePath: `${created.id}/test-last.jpg`,
      position: MIN_PHOTOS_TO_ACTIVATE - 1,
    });
    const past = await activateVehicleCore({ id: ownerId }, created.id);
    expect(past).toEqual({
      ok: false,
      reason: "documents_missing_or_not_approved",
    });

    await db
      .delete(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, created.id));
    await db
      .delete(identityVerifications)
      .where(eq(identityVerifications.userId, ownerId));
  });

  it("creates, edits, and deactivates end to end, reflecting after a fresh read", async () => {
    const created = await createVehicleCore(
      { id: ownerId },
      {
        make: "Mazda",
        model: "CX-5",
        year: 2023,
        plate: "TST002",
        color: "Gris",
        seats: 5,
        dailyPriceCents: 150_000,
      },
    );

    await updateVehicleCore({ id: ownerId }, created.id, {
      dailyPriceCents: 175_000,
    });
    const [afterEdit] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, created.id));
    expect(afterEdit.dailyPriceCents).toBe(175_000);

    await deactivateVehicleCore({ id: ownerId }, created.id);
    const [afterDeactivate] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, created.id));
    expect(afterDeactivate.status).toBe("inactive");
  });

  it("returns 404-equivalent (NotFoundError) when another owner tries to edit it", async () => {
    await db.insert(users).values({
      id: otherId,
      email: `${otherId}@test.local`,
      fullName: "Other",
    });

    const created = await createVehicleCore(
      { id: ownerId },
      {
        make: "Kia",
        model: "Rio",
        year: 2021,
        plate: "TST003",
        color: "Negro",
        seats: 5,
        dailyPriceCents: 80_000,
      },
    );

    await expect(
      updateVehicleCore({ id: otherId }, created.id, { dailyPriceCents: 1 }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const [unchanged] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, created.id));
    expect(unchanged.dailyPriceCents).toBe(80_000);
  });
});
