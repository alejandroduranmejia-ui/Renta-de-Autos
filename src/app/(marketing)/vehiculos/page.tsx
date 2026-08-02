import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { VehicleSearchBar } from "@/components/vehicles/vehicle-search-bar";
import { listActiveVehicles } from "@/server/vehicles/queries";

export default async function VehiculosPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}) {
  const params = await searchParams;
  const minPriceCents = params.minPrice
    ? Number(params.minPrice) * 100
    : undefined;
  const maxPriceCents = params.maxPrice
    ? Number(params.maxPrice) * 100
    : undefined;

  const vehicles = await listActiveVehicles({
    from: params.from ? new Date(params.from) : undefined,
    to: params.to ? new Date(params.to) : undefined,
    minPriceCents,
    maxPriceCents,
  });

  const hasFilters = Boolean(
    params.from || params.to || params.minPrice || params.maxPrice,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">
        Vehículos disponibles
      </h1>

      <VehicleSearchBar
        initialFrom={params.from}
        initialTo={params.to}
        initialMinPrice={params.minPrice}
        initialMaxPrice={params.maxPrice}
        hasFilters={hasFilters}
      />

      {vehicles.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {hasFilters
            ? "Ningún vehículo coincide con esa búsqueda."
            : "Todavía no hay vehículos publicados."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <VehicleCard vehicle={vehicle} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
