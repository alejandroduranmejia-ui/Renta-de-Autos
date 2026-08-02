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
import { formatPriceCents } from "@/lib/format";
import { createBooking } from "@/server/bookings/mutations";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShort(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function BookingDatePicker({
  vehicleId,
  dailyPriceCents,
  currency,
}: {
  vehicleId: string;
  dailyPriceCents: number;
  currency: string;
}) {
  const [range, setRange] = useState<DateRange | undefined>();

  const nights =
    range?.from && range?.to
      ? Math.round(
          (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;
  const totalCents = nights * dailyPriceCents;

  return (
    <form
      action={createBooking}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
    >
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
            disabled={{ before: new Date() }}
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

      {nights > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">
            {formatPriceCents(dailyPriceCents, currency)} × {nights}{" "}
            {nights === 1 ? "noche" : "noches"}
          </span>
          <span className="font-medium text-foreground">
            {formatPriceCents(totalCents, currency)}
          </span>
        </div>
      )}

      <Button type="submit" size="lg" disabled={nights === 0} className="h-11">
        Reservar
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        No se te cobrará todavía.
      </p>
    </form>
  );
}
