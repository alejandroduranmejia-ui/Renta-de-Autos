"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { formatPriceCents } from "@/lib/format";
import { PLATFORM_COMMISSION_RATE } from "@/lib/pricing";

const CURRENCY = "COP";

// La comisión sale de `PLATFORM_COMMISSION_RATE`, nunca de un 20% escrito a mano aquí: si la
// comisión cambia, esta calculadora no puede quedarse prometiendo la cifra vieja.
export function EarningsCalculator() {
  const [dailyPrice, setDailyPrice] = useState(120_000);
  const [daysPerMonth, setDaysPerMonth] = useState(8);

  const grossCents = dailyPrice * 100 * daysPerMonth;
  const commissionCents = Math.round(grossCents * PLATFORM_COMMISSION_RATE);
  const netCents = grossCents - commissionCents;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="dailyPrice">Tu precio por día</Label>
          <span className="text-sm font-medium text-card-foreground">
            {formatPriceCents(dailyPrice * 100, CURRENCY)}
          </span>
        </div>
        <input
          id="dailyPrice"
          type="range"
          min={40_000}
          max={500_000}
          step={10_000}
          value={dailyPrice}
          onChange={(event) => setDailyPrice(Number(event.target.value))}
          className="accent-primary"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="daysPerMonth">Días rentado al mes</Label>
          <span className="text-sm font-medium text-card-foreground">
            {daysPerMonth} {daysPerMonth === 1 ? "día" : "días"}
          </span>
        </div>
        <input
          id="daysPerMonth"
          type="range"
          min={1}
          max={30}
          step={1}
          value={daysPerMonth}
          onChange={(event) => setDaysPerMonth(Number(event.target.value))}
          className="accent-primary"
        />
      </div>

      <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Cobrado al arrendatario</dt>
          <dd className="text-card-foreground">
            {formatPriceCents(grossCents, CURRENCY)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            Comisión de la plataforma ({Math.round(PLATFORM_COMMISSION_RATE * 100)}%)
          </dt>
          <dd className="text-card-foreground">
            −{formatPriceCents(commissionCents, CURRENCY)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-medium text-card-foreground">Recibes al mes</dt>
          <dd className="text-2xl font-semibold text-card-foreground">
            {formatPriceCents(netCents, CURRENCY)}
          </dd>
        </div>
      </dl>

      {/* El mismo descargo que pone Turo, y por la misma razón: es un estimado bruto de operación,
          no una promesa de rentabilidad. */}
      <p className="text-xs text-muted-foreground">
        Estimado antes de tus gastos de mantenimiento, seguro e impuestos. No es
        una promesa de ingresos: depende de la demanda real de tu ciudad y de
        cuántos días aceptes rentar.
      </p>
    </div>
  );
}
