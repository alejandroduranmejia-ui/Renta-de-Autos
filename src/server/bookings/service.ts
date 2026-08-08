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

  // Antes de chocar contra el exclusion constraint: si el slot solo está tomado por un hold que
  // ya venció, liberarlo aquí convierte un "no disponible" falso en una reserva válida.
  await releaseExpiredHoldsForVehicle(params.vehicleId, now);

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

/** Libera los holds vencidos de UN vehículo. Se llama justo antes de intentar reservarlo.
 *
 *  El cron de `/api/cron/expirar-holds` hace la limpieza general, pero hacer que la
 *  disponibilidad dependa de que un trabajo programado haya corrido es frágil: si el cron falla,
 *  o el plan de Vercel solo permite ejecutarlo una vez al día, un hold sin pagar sigue reteniendo
 *  el vehículo y el exclusion constraint rechaza a cualquier otro arrendatario. Eso es una
 *  denegación de servicio gratuita contra el dueño (auditoría del 2026-08-08).
 *
 *  Con esto, el peor caso de un cron caído es una fecha que se ve ocupada en el calendario, no una
 *  reserva imposible. */
export async function releaseExpiredHoldsForVehicle(
  vehicleId: string,
  now: Date = new Date(),
) {
  return db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(bookings.vehicleId, vehicleId),
        eq(bookings.status, "held"),
        lt(bookings.holdExpiresAt, now),
      ),
    )
    .returning();
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
