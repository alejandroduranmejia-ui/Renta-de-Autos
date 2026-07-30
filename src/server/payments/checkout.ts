import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, charges } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { ConflictError } from "@/server/bookings/service";
import { NotFoundError } from "@/server/errors";

type Actor = { id: string };

// Checkout Session hospedada por el monto total (precio + depósito) con captura manual — el
// depósito nunca se captura salvo un reporte de daño explícito, fuera de alcance de v1
// (.claude/rules/payments.md). Red real, no se prueba aquí (mismo criterio que el paso 10 con
// `getOrCreateConnectOnboardingLinkCore`).
export async function createCheckoutSessionCore(
  actor: Actor,
  bookingId: string,
  returnOrigin: string,
) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking || booking.renterId !== actor.id) {
    throw new NotFoundError("Reserva no encontrada.");
  }
  if (booking.status !== "held") {
    throw new ConflictError("Esta reserva ya no está disponible para pago.");
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    throw new ConflictError("La reserva expiró antes de completar el pago.");
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_intent_data: { capture_method: "manual" },
    line_items: [
      {
        price_data: {
          currency: booking.currency.toLowerCase(),
          unit_amount: booking.priceCents + booking.depositHoldCents,
          product_data: { name: "Reserva de vehículo" },
        },
        quantity: 1,
      },
    ],
    success_url: `${returnOrigin}/mis-reservas?pago=exitoso`,
    cancel_url: `${returnOrigin}/mis-reservas?pago=cancelado`,
    metadata: { bookingId },
  });

  return { checkoutUrl: session.url };
}

// Parte testeable sin red: escribe `charges` y confirma la reserva a partir de un
// payment_intent_id ya obtenido de Stripe — nunca recibe montos del payload del webhook, los
// deriva de la propia reserva (fuente de verdad ya calculada en createBookingCore). Un intento
// repetido con el mismo bookingId choca contra `uq_charges_booking_id` y no hace nada más.
export async function applyCheckoutCompletion(
  bookingId: string,
  stripePaymentIntentId: string,
) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking || booking.status !== "held") {
    return null;
  }

  try {
    const [charge] = await db
      .insert(charges)
      .values({
        bookingId,
        stripePaymentIntentId,
        amountCents: booking.priceCents + booking.depositHoldCents,
        depositHoldCents: booking.depositHoldCents,
        status: "requires_capture",
      })
      .returning();

    await db
      .update(bookings)
      .set({ status: "confirmed" })
      .where(eq(bookings.id, bookingId));

    return charge;
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause;
    if (cause?.code === "23505") {
      return null;
    }
    throw err;
  }
}

// Llamado por el webhook `checkout.session.completed` — nunca confía en el payload del evento,
// vuelve a consultar el objeto real a la API de Stripe antes de escribir
// (.claude/rules/payments.md). No se prueba con red real aquí (mismo criterio que
// `syncConnectedAccountCore`).
export async function syncCheckoutSessionCore(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });
  const bookingId = session.metadata?.bookingId;
  if (!bookingId || session.payment_status !== "paid") {
    return null;
  }

  const paymentIntent = session.payment_intent;
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!paymentIntentId) {
    return null;
  }

  return applyCheckoutCompletion(bookingId, paymentIntentId);
}
