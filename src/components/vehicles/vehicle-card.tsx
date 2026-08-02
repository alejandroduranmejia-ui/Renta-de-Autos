import { MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPriceCents } from "@/lib/format";
import { quoteBooking } from "@/lib/pricing";
import { labelFor, TRANSMISSIONS, VEHICLE_TYPES } from "@/lib/vehicle-taxonomy";
import type { ActiveVehicleListing } from "@/server/vehicles/queries";

export function VehicleCard({
  vehicle,
  tripDates,
}: {
  vehicle: ActiveVehicleListing;
  tripDates?: { from: Date; to: Date };
}) {
  // Con fechas elegidas se muestra el total del viaje, que es lo que la persona compara de
  // verdad; el precio por día queda de apoyo. Sin fechas no hay total que mostrar.
  const quote =
    tripDates && tripDates.to > tripDates.from
      ? quoteBooking({
          dailyPriceCents: vehicle.dailyPriceCents,
          startsAt: tripDates.from,
          endsAt: tripDates.to,
        })
      : null;

  const specs = [
    labelFor(VEHICLE_TYPES, vehicle.vehicleType),
    labelFor(TRANSMISSIONS, vehicle.transmission),
  ].filter(Boolean);

  return (
    <Link href={`/vehiculos/${vehicle.id}`} className="group block">
      <Card className="gap-0 overflow-hidden py-0 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {vehicle.photoUrl ? (
            <Image
              src={vehicle.photoUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin foto
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-background/90 text-foreground shadow-sm">
            {formatPriceCents(vehicle.dailyPriceCents, vehicle.currency)} / día
          </Badge>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <span className="font-medium text-card-foreground">
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </span>
          <span className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {specs.length > 0 ? specs.join(" · ") : vehicle.color}
            <span aria-hidden>·</span>
            <Users className="size-3.5" /> {vehicle.seats}
          </span>
          {vehicle.zone && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {vehicle.zone}
            </span>
          )}
          {quote && (
            <span className="mt-1 text-sm font-medium text-foreground">
              {formatPriceCents(quote.subtotalCents, vehicle.currency)} total
              <span className="font-normal text-muted-foreground">
                {" "}
                por {quote.days} {quote.days === 1 ? "día" : "días"}
              </span>
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
