import { describe, expect, it } from "vitest";
import {
  calculateCommissionCents,
  PLATFORM_COMMISSION_RATE,
  quoteBooking,
} from "@/lib/pricing";

const DAILY = 120_000_00; // $120.000 COP en centavos

function quote(from: string, to: string, dailyPriceCents = DAILY) {
  return quoteBooking({
    dailyPriceCents,
    startsAt: new Date(from),
    endsAt: new Date(to),
  });
}

describe("quoteBooking", () => {
  it("cobra un día por un rango de exactamente 24 horas", () => {
    const q = quote("2026-09-10T10:00:00Z", "2026-09-11T10:00:00Z");
    expect(q.days).toBe(1);
    expect(q.subtotalCents).toBe(DAILY);
  });

  it("redondea hacia arriba un rango parcial — 25 horas son dos días", () => {
    const q = quote("2026-09-10T10:00:00Z", "2026-09-11T11:00:00Z");
    expect(q.days).toBe(2);
    expect(q.subtotalCents).toBe(DAILY * 2);
  });

  it("nunca cotiza menos de un día, aunque el rango sea vacío", () => {
    // El rango vacío lo rechaza `createBookingCore` antes de llegar aquí; esto solo fija que la
    // cotización jamás devuelva 0 días ni un subtotal negativo si alguien la llama directo.
    const q = quote("2026-09-10T10:00:00Z", "2026-09-10T10:00:00Z");
    expect(q.days).toBe(1);
    expect(q.subtotalCents).toBe(DAILY);
  });

  it("cuenta bien un rango que cruza de mes", () => {
    const q = quote("2026-08-30T10:00:00Z", "2026-09-02T10:00:00Z");
    expect(q.days).toBe(3);
  });

  it("autoriza el subtotal más el depósito, y solo cobra el subtotal al final", () => {
    const q = quote("2026-09-10T10:00:00Z", "2026-09-13T10:00:00Z");
    expect(q.days).toBe(3);
    expect(q.depositHoldCents).toBe(DAILY);
    expect(q.authorizedTodayCents).toBe(q.subtotalCents + q.depositHoldCents);
    expect(q.chargedAtEndCents).toBe(q.subtotalCents);
    // El depósito es la diferencia entre lo autorizado y lo cobrado — nunca se captura.
    expect(q.authorizedTodayCents - q.chargedAtEndCents).toBe(
      q.depositHoldCents,
    );
  });

  it("descuenta la comisión del pago al dueño, sin sumársela al arrendatario", () => {
    const q = quote("2026-09-10T10:00:00Z", "2026-09-13T10:00:00Z");
    expect(q.ownerCommissionCents).toBe(
      calculateCommissionCents(q.subtotalCents),
    );
    expect(q.ownerPayoutCents).toBe(q.subtotalCents - q.ownerCommissionCents);
    // Lo que paga el arrendatario no depende de la comisión.
    expect(q.chargedAtEndCents).toBe(q.subtotalCents);
    expect(q.ownerPayoutCents).toBe(
      Math.round(q.subtotalCents * (1 - PLATFORM_COMMISSION_RATE)),
    );
  });

  it("mantiene todos los montos en centavos enteros", () => {
    // Un precio que no divide exacto al aplicar el 20%.
    const q = quote("2026-09-10T10:00:00Z", "2026-09-11T10:00:00Z", 33_333);
    for (const value of Object.values(q)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
