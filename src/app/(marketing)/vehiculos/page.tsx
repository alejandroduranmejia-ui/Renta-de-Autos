import Image from "next/image";
import { listActiveVehicles } from "@/server/vehicles/queries";

function formatDailyPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function VehiculosPage() {
  const vehicles = await listActiveVehicles();

  return (
    <div className="flex flex-col gap-6 px-6 py-12">
      <h1 className="text-xl font-semibold text-foreground">
        Vehículos disponibles
      </h1>

      {vehicles.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay vehículos publicados.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <li
              key={vehicle.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-video bg-muted">
                {vehicle.photoUrl && (
                  <Image
                    src={vehicle.photoUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1 p-4">
                <span className="font-medium text-card-foreground">
                  {vehicle.make} {vehicle.model} ({vehicle.year})
                </span>
                <span className="text-sm text-muted-foreground">
                  {vehicle.color} · {vehicle.seats} puestos
                </span>
                <span className="mt-2 text-sm font-medium text-foreground">
                  {formatDailyPrice(vehicle.dailyPriceCents, vehicle.currency)}{" "}
                  / día
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
