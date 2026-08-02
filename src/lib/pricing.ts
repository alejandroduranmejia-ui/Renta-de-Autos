// Comisión de la plataforma sobre cada reserva — confirmada explícitamente por el usuario
// (blueprint.md §20.3, decisión #7). Un solo lugar; nunca repetir el número en otro archivo.
export const PLATFORM_COMMISSION_RATE = 0.2;

export function calculateCommissionCents(priceCents: number) {
  return Math.round(priceCents * PLATFORM_COMMISSION_RATE);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Cotización de una reserva — la ÚNICA fórmula de duración y precio del repo. Antes vivía
// duplicada en `bookings/service.ts` (`max(1, ceil)`) y en `booking-date-picker.tsx` (`round`);
// las dos coincidían solo mientras la UI mandara días enteros, y divergían en cuanto se
// agregaran horas de recogida. Server y cliente ahora llaman aquí.
//
// Flujo real del dinero, verificado contra `payments/checkout.ts` y `payments/transfers.ts`:
// al arrendatario se le AUTORIZA `subtotal + depósito` con captura manual; al completar la renta
// se captura solo el subtotal y el depósito se libera sin capturarse. La comisión sale del pago
// al dueño — nunca se le suma al arrendatario, por eso no aparece en su desglose.
export type BookingQuote = {
  days: number;
  subtotalCents: number;
  depositHoldCents: number;
  /** Lo que Stripe autoriza al confirmar la reserva. */
  authorizedTodayCents: number;
  /** Lo que se captura de verdad al terminar la renta. */
  chargedAtEndCents: number;
  ownerCommissionCents: number;
  ownerPayoutCents: number;
};

export function quoteBooking(params: {
  dailyPriceCents: number;
  startsAt: Date;
  endsAt: Date;
}): BookingQuote {
  const { dailyPriceCents, startsAt, endsAt } = params;

  const days = Math.max(
    1,
    Math.ceil((endsAt.getTime() - startsAt.getTime()) / MS_PER_DAY),
  );
  const subtotalCents = dailyPriceCents * days;
  // Depósito de garantía: el precio de un día — ajustable, no es la comisión de plataforma
  // (esa sí es una decisión de negocio confirmada, blueprint.md §20.3 #7).
  const depositHoldCents = dailyPriceCents;
  const ownerCommissionCents = calculateCommissionCents(subtotalCents);

  return {
    days,
    subtotalCents,
    depositHoldCents,
    authorizedTodayCents: subtotalCents + depositHoldCents,
    chargedAtEndCents: subtotalCents,
    ownerCommissionCents,
    ownerPayoutCents: subtotalCents - ownerCommissionCents,
  };
}
