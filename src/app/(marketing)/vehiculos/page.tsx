import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { VehicleSearchBar } from "@/components/vehicles/vehicle-search-bar";
import { parseIsoDate } from "@/lib/date";
import {
  listActiveVehicles,
  listActiveZones,
  type VehicleSort,
} from "@/server/vehicles/queries";

export const metadata: Metadata = {
  title: "Vehículos disponibles",
  description:
    "Vehículos de particulares con identidad y documentos verificados, disponibles para rentar por día.",
};

const SORT_LABELS: Record<VehicleSort, string> = {
  precio_asc: "Precio: menor primero",
  precio_desc: "Precio: mayor primero",
  recientes: "Más recientes",
};

function isSort(value: string | undefined): value is VehicleSort {
  return (
    value === "precio_asc" || value === "precio_desc" || value === "recientes"
  );
}

/** `searchParams` entrega string cuando el parámetro viene una vez y string[] cuando se repite —
 * los checkboxes de tipo y combustible se repiten, así que siempre se normaliza a arreglo. */
function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

type Params = {
  from?: string;
  to?: string;
  minPrice?: string;
  maxPrice?: string;
  zone?: string;
  vehicleType?: string | string[];
  transmission?: string;
  fuelType?: string | string[];
  minSeats?: string;
  sort?: string;
  page?: string;
};

/** Conserva los filtros actuales al cambiar de página o de orden. */
function buildQuery(params: Params, overrides: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      query.append(key, item);
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    query.delete(key);
    query.set(key, value);
  }
  return `/vehiculos?${query.toString()}`;
}

export default async function VehiculosPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;

  const vehicleType = toArray(params.vehicleType);
  const fuelType = toArray(params.fuelType);
  const sort = isSort(params.sort) ? params.sort : "precio_asc";

  const [page, zones] = await Promise.all([
    listActiveVehicles({
      from: params.from ? parseIsoDate(params.from) : undefined,
      to: params.to ? parseIsoDate(params.to) : undefined,
      minPriceCents: params.minPrice
        ? Number(params.minPrice) * 100
        : undefined,
      maxPriceCents: params.maxPrice
        ? Number(params.maxPrice) * 100
        : undefined,
      zone: params.zone || undefined,
      vehicleTypes: vehicleType,
      transmission: params.transmission || undefined,
      fuelTypes: fuelType,
      minSeats: params.minSeats ? Number(params.minSeats) : undefined,
      sort,
      page: params.page ? Number(params.page) : 1,
    }),
    listActiveZones(),
  ]);

  const hasFilters = Boolean(
    params.from ||
      params.to ||
      params.minPrice ||
      params.maxPrice ||
      params.zone ||
      vehicleType?.length ||
      params.transmission ||
      fuelType?.length ||
      params.minSeats,
  );

  const from = params.from ? parseIsoDate(params.from) : undefined;
  const to = params.to ? parseIsoDate(params.to) : undefined;
  const tripDates = from && to ? { from, to } : undefined;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">
        Vehículos disponibles
      </h1>

      <VehicleSearchBar
        values={{
          from: params.from,
          to: params.to,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          zone: params.zone,
          vehicleType,
          transmission: params.transmission,
          fuelType,
          minSeats: params.minSeats,
          sort,
        }}
        zones={zones}
        hasFilters={hasFilters}
      />

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-success" />
        Todo vehículo publicado tiene la identidad de su dueño y los documentos
        del vehículo verificados por nosotros.
      </p>

      {page.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">
            {page.total}{" "}
            {page.total === 1 ? "vehículo disponible" : "vehículos disponibles"}
          </span>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {(Object.keys(SORT_LABELS) as VehicleSort[]).map((key) => (
              <Link
                key={key}
                href={buildQuery(params, { sort: key, page: "1" })}
                aria-current={sort === key ? "true" : undefined}
                className={
                  sort === key
                    ? "rounded-full bg-secondary px-3 py-1 font-medium text-foreground"
                    : "rounded-full px-3 py-1 text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {SORT_LABELS[key]}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {page.items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {hasFilters
            ? "Ningún vehículo coincide con esa búsqueda."
            : "Todavía no hay vehículos publicados."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((vehicle) => (
            <li key={vehicle.id}>
              <VehicleCard vehicle={vehicle} tripDates={tripDates} />
            </li>
          ))}
        </ul>
      )}

      {page.pageCount > 1 && (
        <nav className="flex items-center justify-center gap-3 pt-4">
          {page.page > 1 && (
            <Link
              href={buildQuery(params, { page: String(page.page - 1) })}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Anterior
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page.page} de {page.pageCount}
          </span>
          {page.page < page.pageCount && (
            <Link
              href={buildQuery(params, { page: String(page.page + 1) })}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Siguiente
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
