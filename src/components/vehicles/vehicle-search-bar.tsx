"use client";

import { CalendarIcon, Search, SlidersHorizontal, X } from "lucide-react";
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
import { parseIsoDate, toIsoDate } from "@/lib/date";
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TYPES,
} from "@/lib/vehicle-taxonomy";

function formatShort(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export type SearchBarValues = {
  from?: string;
  to?: string;
  minPrice?: string;
  maxPrice?: string;
  zone?: string;
  vehicleType?: string[];
  transmission?: string;
  fuelType?: string[];
  minSeats?: string;
  sort?: string;
};

// Sigue siendo un `<form method="get">`: los filtros viven en la URL, así una búsqueda se puede
// compartir y el botón "atrás" del navegador funciona. Lo único con estado de cliente es el
// calendario (que no tiene equivalente nativo) y el desplegable de filtros avanzados.
export function VehicleSearchBar({
  values,
  zones,
  hasFilters,
}: {
  values: SearchBarValues;
  zones: string[];
  hasFilters: boolean;
}) {
  const [range, setRange] = useState<DateRange | undefined>(
    values.from
      ? {
          from: parseIsoDate(values.from),
          to: values.to ? parseIsoDate(values.to) : undefined,
        }
      : undefined,
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(
      values.vehicleType?.length ||
        values.transmission ||
        values.fuelType?.length ||
        values.minSeats,
    ),
  );

  return (
    <form
      action="/vehiculos"
      method="get"
      className="flex flex-col gap-4 surface p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="zone" className="text-xs text-muted-foreground">
            Zona
          </Label>
          <select
            id="zone"
            name="zone"
            defaultValue={values.zone ?? ""}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Toda la ciudad</option>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>

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

        <div className="flex gap-2">
          <Button type="submit" className="gap-1.5">
            <Search className="size-4" />
            Buscar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-expanded={showAdvanced}
            aria-label="Más filtros"
            onClick={() => setShowAdvanced((open) => !open)}
          >
            <SlidersHorizontal className="size-4" />
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" size="icon" asChild>
              <Link href="/vehiculos" aria-label="Limpiar filtros">
                <X className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
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
              defaultValue={values.minPrice}
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
              defaultValue={values.maxPrice}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minSeats" className="text-xs text-muted-foreground">
              Puestos mínimos
            </Label>
            <Input
              id="minSeats"
              name="minSeats"
              type="number"
              min={1}
              max={20}
              placeholder="Cualquiera"
              defaultValue={values.minSeats}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="transmission"
              className="text-xs text-muted-foreground"
            >
              Transmisión
            </Label>
            <select
              id="transmission"
              name="transmission"
              defaultValue={values.transmission ?? ""}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Cualquiera</option>
              {Object.entries(TRANSMISSIONS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="col-span-2 flex flex-col gap-2 sm:col-span-3 lg:col-span-5">
            <legend className="mb-1 text-xs text-muted-foreground">
              Tipo de vehículo
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(VEHICLE_TYPES).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    name="vehicleType"
                    value={key}
                    defaultChecked={values.vehicleType?.includes(key)}
                    className="size-4 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="col-span-2 flex flex-col gap-2 sm:col-span-3 lg:col-span-5">
            <legend className="mb-1 text-xs text-muted-foreground">
              Combustible
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(FUEL_TYPES).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    name="fuelType"
                    value={key}
                    defaultChecked={values.fuelType?.includes(key)}
                    className="size-4 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {/* El orden se envía con el resto del formulario para no perderse al buscar de nuevo. */}
      {values.sort && <input type="hidden" name="sort" value={values.sort} />}
    </form>
  );
}
