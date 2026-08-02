import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { bookings, vehicles } from "@/lib/db/schema";

// IDs fijos que escribe scripts/seed.ts.
const SEEDED_VEHICLE_ID = "00000000-0000-0000-0000-000000000010";
const SEEDED_BOOKING_ID = "00000000-0000-0000-0000-000000000020";

describe("seed", () => {
  // Acotado a las filas del seed en vez de contar todas las activas de la base. El conteo global
  // hacía que cualquier otro archivo de test que creara un vehículo activo — vitest corre los
  // archivos en paralelo contra la misma base — rompiera este test sin que el seed tuviera nada
  // que ver. La afirmación de fondo ("el seed deja su vehículo activo y su reserva confirmada")
  // es la misma.
  it("leaves its vehicle active and its booking confirmed", async () => {
    const activeVehicles = await db
      .select()
      .from(vehicles)
      .where(
        and(eq(vehicles.id, SEEDED_VEHICLE_ID), eq(vehicles.status, "active")),
      );
    const confirmedBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.id, SEEDED_BOOKING_ID),
          eq(bookings.status, "confirmed"),
        ),
      );

    expect(activeVehicles).toHaveLength(1);
    expect(confirmedBookings).toHaveLength(1);
  });
});
