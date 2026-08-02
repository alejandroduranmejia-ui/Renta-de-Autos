import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { toIsoDate } from "@/lib/date";
import { db } from "@/lib/db";
import { availabilityExceptions, users, vehicles } from "@/lib/db/schema";
import { NotFoundError } from "@/server/errors";
import {
  getVehicleUnavailableDates,
  listActiveVehicles,
} from "@/server/vehicles/queries";
import {
  blockVehicleDatesCore,
  unblockVehicleDatesCore,
} from "@/server/vehicles/service";

const OWNER_ID = "cccccccc-0000-0000-0000-000000000001";
const OTHER_ID = "cccccccc-0000-0000-0000-000000000002";
const VEHICLE_ID = "cccccccc-0000-0000-0000-000000000010";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

describe("bloqueo de disponibilidad", () => {
  afterAll(async () => {
    await db
      .delete(availabilityExceptions)
      .where(eq(availabilityExceptions.vehicleId, VEHICLE_ID));
    await db.delete(vehicles).where(eq(vehicles.id, VEHICLE_ID));
    await db.delete(users).where(eq(users.id, OWNER_ID));
    await db.delete(users).where(eq(users.id, OTHER_ID));
  });

  it("deja disponible todo vehículo sin reglas semanales configuradas", async () => {
    // La regresión que más importa de esta ola: `computeSlots` con una lista vacía de reglas
    // marca TODOS los días como no disponibles. Sin el respaldo "sin reglas = siempre abierto",
    // conectar el motor habría bloqueado el calendario de cada vehículo ya publicado y ninguna
    // reserva sería posible.
    await db.insert(users).values([
      { id: OWNER_ID, email: `${OWNER_ID}@test.local`, fullName: "Owner" },
      { id: OTHER_ID, email: `${OTHER_ID}@test.local`, fullName: "Other" },
    ]);
    await db.insert(vehicles).values({
      id: VEHICLE_ID,
      ownerId: OWNER_ID,
      make: "Renault",
      model: "Logan",
      year: 2022,
      plate: "AVL001",
      color: "Blanco",
      seats: 5,
      dailyPriceCents: 100_000,
      status: "active",
    });

    const unavailable = await getVehicleUnavailableDates(VEHICLE_ID);
    for (let offset = 1; offset <= 30; offset++) {
      expect(unavailable).not.toContain(toIsoDate(daysFromNow(offset)));
    }
  });

  it("bloquea exactamente el rango pedido, sin correrse a los días vecinos", async () => {
    const from = toIsoDate(daysFromNow(10));
    const to = toIsoDate(daysFromNow(12));

    await blockVehicleDatesCore({ id: OWNER_ID }, VEHICLE_ID, { from, to });

    const unavailable = await getVehicleUnavailableDates(VEHICLE_ID);
    expect(unavailable).toContain(from);
    expect(unavailable).toContain(toIsoDate(daysFromNow(11)));
    expect(unavailable).toContain(to);
    // El día anterior y el siguiente siguen libres — es lo que se rompe si los límites de la
    // excepción no usan la misma convención de día que `computeSlots`.
    expect(unavailable).not.toContain(toIsoDate(daysFromNow(9)));
    expect(unavailable).not.toContain(toIsoDate(daysFromNow(13)));
  });

  it("saca de los resultados de búsqueda un vehículo con esas fechas bloqueadas", async () => {
    const blocked = await listActiveVehicles({
      from: daysFromNow(10),
      to: daysFromNow(12),
    });
    expect(blocked.items.map((v) => v.id)).not.toContain(VEHICLE_ID);

    const free = await listActiveVehicles({
      from: daysFromNow(40),
      to: daysFromNow(42),
    });
    expect(free.items.map((v) => v.id)).toContain(VEHICLE_ID);
  });

  it("rechaza un rango invertido", async () => {
    await expect(
      blockVehicleDatesCore({ id: OWNER_ID }, VEHICLE_ID, {
        from: toIsoDate(daysFromNow(20)),
        to: toIsoDate(daysFromNow(18)),
      }),
    ).rejects.toThrow();
  });

  it("no deja que otro usuario bloquee ni desbloquee el vehículo", async () => {
    await expect(
      blockVehicleDatesCore({ id: OTHER_ID }, VEHICLE_ID, {
        from: toIsoDate(daysFromNow(50)),
        to: toIsoDate(daysFromNow(51)),
      }),
    ).rejects.toThrow(NotFoundError);

    const [existing] = await db
      .select()
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.vehicleId, VEHICLE_ID))
      .limit(1);

    await expect(
      unblockVehicleDatesCore({ id: OTHER_ID }, VEHICLE_ID, existing.id),
    ).rejects.toThrow(NotFoundError);

    // Y no escribió ni borró nada.
    const stillThere = await db
      .select()
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.vehicleId, VEHICLE_ID));
    expect(stillThere).toHaveLength(1);
  });

  it("libera las fechas al quitar el bloqueo", async () => {
    const [block] = await db
      .select()
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.vehicleId, VEHICLE_ID))
      .limit(1);

    await unblockVehicleDatesCore({ id: OWNER_ID }, VEHICLE_ID, block.id);

    const unavailable = await getVehicleUnavailableDates(VEHICLE_ID);
    expect(unavailable).not.toContain(toIsoDate(daysFromNow(10)));
  });
});
