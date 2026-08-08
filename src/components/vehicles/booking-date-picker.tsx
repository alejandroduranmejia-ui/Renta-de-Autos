"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseIsoDate, toIsoDate } from "@/lib/date";
import { formatPriceCents } from "@/lib/format";
import { quoteBooking } from "@/lib/pricing";
import { createBooking } from "@/server/bookings/mutations";

function formatShort(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function BookingDatePicker({
  vehicleId,
  dailyPriceCents,
  currency,
  unavailableDates = [],
}: {
  vehicleId: string;
  dailyPriceCents: number;
  currency: string;
  /** Días "YYYY-MM-DD" que el dueño bloqueó o que ya están reservados. */
  unavailableDates?: string[];
}) {
  const [range, setRange] = useState<DateRange | undefined>();

  // Se calcula una vez: la lista viene del servidor y no cambia mientras la página está abierta.
  const [disabledDays] = useState(() =>
    unavailableDates
      .map(parseIsoDate)
      .filter((date): date is Date => date !== undefined),
  );

  // El servidor rechaza `endsAt <= startsAt` (bookings/service.ts), así que la UI exige lo mismo
  // antes de cotizar — de otro modo el botón se habilitaría para un rango que la acción rechaza.
  const hasValidRange = Boolean(
    range?.from && range?.to && range.to > range.from,
  );
  const quote =
    hasValidRange && range?.from && range?.to
      ? quoteBooking({
          dailyPriceCents,
          startsAt: range.from,
          endsAt: range.to,
        })
      : null;

  return (
    <form action={createBooking} className="flex flex-col gap-4 surface p-5">
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold text-foreground">
          {formatPriceCents(dailyPriceCents, currency)}
        </span>
        <span className="text-sm text-muted-foreground">/ día</span>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="justify-start font-normal"
          >
            <CalendarIcon className="size-4" />
            {range?.from ? (
              range.to ? (
                <>
                  {formatShort(range.from)} – {formatShort(range.to)}
                </>
              ) : (
                formatShort(range.from)
              )
            ) : (
              "Elige tus fechas"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            disabled={[{ before: new Date() }, ...disabledDays]}
          />
        </PopoverContent>
      </Popover>

      <input type="hidden" name="vehicleId" value={vehicleId} />
      {range?.from && (
        <input type="hidden" name="startsAt" value={toIsoDate(range.from)} />
      )}
      {range?.to && (
        <input type="hidden" name="endsAt" value={toIsoDate(range.to)} />
      )}

      {quote && (
        <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {formatPriceCents(dailyPriceCents, currency)} × {quote.days}{" "}
              {quote.days === 1 ? "día" : "días"}
            </span>
            <span className="text-foreground">
              {formatPriceCents(quote.subtotalCents, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Depósito reembolsable</span>
            <span className="text-foreground">
              {formatPriceCents(quote.depositHoldCents, currency)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 font-medium">
            <span className="text-foreground">Autorizado hoy</span>
            <span className="text-foreground">
              {formatPriceCents(quote.authorizedTodayCents, currency)}
            </span>
          </div>
        </div>
      )}

      <Button type="submit" size="lg" disabled={!quote} className="h-11">
        Reservar
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {quote
          ? `Se cobra ${formatPriceCents(quote.chargedAtEndCents, currency)} al terminar la renta; el depósito se libera si no hay daños.`
          : "El depósito se autoriza, no se cobra: se libera si no hay daños."}
      </p>
    </form>
  );
}
