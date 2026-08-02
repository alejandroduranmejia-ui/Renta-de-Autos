"use client";

import { CalendarIcon, Search } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toIsoDate } from "@/lib/date";

function formatShort(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// Buscar desde la portada, sin un clic intermedio. Antes el hero solo tenía un botón que llevaba
// a otra página a buscar; Turo pone el buscador dentro del hero por la misma razón.
export function HeroSearch({ zones }: { zones: string[] }) {
  const [range, setRange] = useState<DateRange | undefined>();

  return (
    <form
      action="/vehiculos"
      method="get"
      className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl border border-border bg-background/80 p-2 shadow-lg backdrop-blur-sm sm:flex-row sm:items-center"
    >
      <select
        name="zone"
        aria-label="Zona"
        defaultValue=""
        className="h-11 flex-1 rounded-xl border-0 bg-transparent px-4 text-base text-foreground"
      >
        <option value="">Toda la ciudad</option>
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zone}
          </option>
        ))}
      </select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-11 flex-1 justify-start px-4 text-base font-normal"
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
              "¿Cuándo lo necesitas?"
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

      {range?.from && (
        <input type="hidden" name="from" value={toIsoDate(range.from)} />
      )}
      {range?.to && (
        <input type="hidden" name="to" value={toIsoDate(range.to)} />
      )}

      <Button type="submit" size="lg" className="h-11 gap-1.5 px-6 text-base">
        <Search className="size-4" />
        Buscar
      </Button>
    </form>
  );
}
