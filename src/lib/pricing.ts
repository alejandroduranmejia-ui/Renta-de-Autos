// Comisión de la plataforma sobre cada reserva — confirmada explícitamente por el usuario
// (blueprint.md §20.3, decisión #7). Un solo lugar; nunca repetir el número en otro archivo.
export const PLATFORM_COMMISSION_RATE = 0.2;

export function calculateCommissionCents(priceCents: number) {
  return Math.round(priceCents * PLATFORM_COMMISSION_RATE);
}
