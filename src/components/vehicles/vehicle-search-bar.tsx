"use client";

import { CalendarIcon, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShort(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function VehicleSearchBar({
  initialFrom,
  initialTo,
  initialMinPrice,
  initialMaxPrice,
  hasFilters,
}: {
  initialFrom?: string;
  initialTo?: string;
  initialMinPrice?: string;
  initialMaxPrice?: string;
  hasFilters: boolean;
}) {
  const [range, setRange] = useState<DateRange | undefined>(
    initialFrom
      ? {
          from: new Date(initialFrom),
          to: initialTo ? new Date(initialTo) : undefined,
        }
      : undefined,
  );

  return (
    <form
      action="/vehiculos"
      method="get"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-end sm:gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Fechas</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="justify-start font-normal sm:w-56"
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
                "Cuándo"
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="minPrice" className="text-xs text-muted-foreground">
          Precio mín. / día
        </Label>
        <Input
          id="minPrice"
          name="minPrice"
          type="number"
          min={0}
          placeholder="$0"
          defaultValue={initialMinPrice}
          className="sm:w-32"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">
          Precio máx. / día
        </Label>
        <Input
          id="maxPrice"
          name="maxPrice"
          type="number"
          min={0}
          placeholder="Sin límite"
          defaultValue={initialMaxPrice}
          className="sm:w-32"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="gap-1.5">
          <Search className="size-4" />
          Buscar
        </Button>
        {hasFilters && (
          <Button type="button" variant="ghost" size="icon" asChild>
            <Link href="/vehiculos" aria-label="Limpiar filtros">
              <X className="size-4" />
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
