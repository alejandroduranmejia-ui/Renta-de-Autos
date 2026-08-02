import { and, eq, lt } from "drizzle-orm";
import { VEHICLE_TIMEZONE } from "@/lib/date";
import { db } from "@/lib/db";
import { bookings, vehicles } from "@/lib/db/schema";
import { quoteBooking } from "@/lib/pricing";
import { NotFoundError } from "@/server/errors";

// Capa de servicio — sin `cookies()`/`headers()` (blueprint.md §9, "Toda mutación real vive en
// service.ts").

export class ConflictError extends Error {}

const HOLD_MINUTES = 15;
// Exportado porque el cálculo de disponibilidad que alimenta el calendario tiene que usar el
// mismo aviso mínimo que esta función exige, o la UI ofrecería un día que la reserva rechaza.
export const MIN_NOTICE_HOURS = 2;

type Actor = { id: string };

export async function createBookingCore(
  actor: Actor,
  params: { vehicleId: string; startsAt: Date; endsAt: Date },
) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, params.vehicleId))
    .limit(1);
  if (!vehicle || vehicle.status !== "active") {
    throw new NotFoundError("Vehículo no disponible.");
  }

  const now = new Date();
  const minNoticeMs = MIN_NOTICE_HOURS * 60 * 60 * 1000;
  if (params.startsAt.getTime() - now.getTime() < minNoticeMs) {
    throw new ConflictError("La reserva no cumple el aviso mínimo.");
  }
  if (params.endsAt <= params.startsAt) {
    throw new ConflictError(
      "La fecha de devolución debe ser posterior a la de recogida.",
    );
  }

  // Misma cotización que ve el arrendatario en la ficha — una sola fórmula (src/lib/pricing.ts).
  const quote = quoteBooking({
    dailyPriceCents: vehicle.dailyPriceCents,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
  });

  try {
    const [created] = await db
      .insert(bookings)
      .values({
        vehicleId: params.vehicleId,
        renterId: actor.id,
        startsAt: params.startsAt,
        endsAt: params.endsAt,
        status: "held",
        holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60 * 1000),
        priceCents: quote.subtotalCents,
        commissionCents: quote.ownerCommissionCents,
        depositHoldCents: quote.depositHoldCents,
        currency: vehicle.currency,
        timezoneAtBooking: VEHICLE_TIMEZONE,
      })
      .returning();
    return created;
  } catch (err) {
    const cause = (
      err as { cause?: { code?: string; constraint_name?: string } }
    ).cause;
    if (
      cause?.code === "23P01" ||
      cause?.constraint_name === "excl_bookings_no_overlap"
    ) {
      throw new ConflictError("Ese vehículo ya está reservado en esas fechas.");
    }
    throw err;
  }
}

export async function cancelBookingCore(actor: Actor, bookingId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking || booking.renterId !== actor.id) {
    throw new NotFoundError("Reserva no encontrada.");
  }
  if (booking.status !== "held" && booking.status !== "confirmed") {
    throw new ConflictError("Esta reserva ya no se puede cancelar.");
  }

  const [updated] = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(eq(bookings.id, bookingId))
    .returning();
  return updated;
}

// Llamado por el cron del paso 14 — expira los holds vencidos sin pago, liberando el slot (el
// exclusion constraint solo excluye status in ('held','confirmed','active'), así que pasar a
// 'cancelled' libera el rango automáticamente).
export async function releaseExpiredHoldsCore(now: Date = new Date()) {
  return db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.status, "held"), lt(bookings.holdExpiresAt, now)))
    .returning();
}
