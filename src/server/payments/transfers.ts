import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  charges,
  connectedAccounts,
  transfers,
  vehicles,
} from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { NotFoundError } from "@/server/errors";

// Escritura testeable sin red del caso éxito: registra la transferencia y solo entonces marca la
// reserva como `completed` — nunca antes, para no liquidar sobre una transferencia que aún no
// existe (.claude/rules/payments.md).
export async function applyTransferSuccess(
  bookingId: string,
  stripeTransferId: string,
  amountCents: number,
) {
  const [transfer] = await db
    .insert(transfers)
    .values({ bookingId, stripeTransferId, amountCents, status: "paid" })
    .returning();
  await db
    .update(bookings)
    .set({ status: "completed" })
    .where(eq(bookings.id, bookingId));
  return transfer;
}

// Escritura testeable sin red del caso fallo: deja un registro `failed` y NO toca el estado de la
// reserva — se queda liquidable a mano o por un reintento posterior (blueprint.md §9, paso 12).
// `stripeTransferId` es sintético (nunca hubo un objeto real de Stripe que devolviera uno) — se
// arma con un timestamp para no chocar con reintentos previos también fallidos.
export async function applyTransferFailure(
  bookingId: string,
  amountCents: number,
) {
  const [transfer] = await db
    .insert(transfers)
    .values({
      bookingId,
      stripeTransferId: `failed_${bookingId}_${Date.now()}`,
      amountCents,
      status: "failed",
    })
    .returning();
  return transfer;
}

// Orquesta el flujo real contra Stripe: captura solo el precio (libera el depósito sin
// capturarlo) y transfiere `price_cents - commission_cents` a la cuenta conectada del dueño. Red
// real, no se prueba aquí (mismo criterio que los pasos 10 y 11).
export async function completeBookingWithTransferCore(bookingId: string) {
  const [row] = await db
    .select({ booking: bookings, ownerId: vehicles.ownerId })
    .from(bookings)
    .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (
    !row ||
    (row.booking.status !== "confirmed" && row.booking.status !== "active")
  ) {
    throw new NotFoundError("Reserva no lista para liquidar.");
  }

  const [charge] = await db
    .select()
    .from(charges)
    .where(eq(charges.bookingId, bookingId))
    .limit(1);
  const [connected] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.ownerId, row.ownerId))
    .limit(1);
  if (!charge || !connected) {
    throw new NotFoundError("Falta el cobro o la cuenta conectada del dueño.");
  }

  const amountCents = row.booking.priceCents - row.booking.commissionCents;
  try {
    await stripe.paymentIntents.capture(charge.stripePaymentIntentId, {
      amount_to_capture: row.booking.priceCents,
    });
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: row.booking.currency.toLowerCase(),
      destination: connected.stripeAccountId,
      transfer_group: bookingId,
    });
    return applyTransferSuccess(bookingId, transfer.id, amountCents);
  } catch {
    return applyTransferFailure(bookingId, amountCents);
  }
}
