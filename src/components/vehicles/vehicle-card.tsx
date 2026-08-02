import { Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPriceCents } from "@/lib/format";
import type { ActiveVehicleListing } from "@/server/vehicles/queries";

export function VehicleCard({ vehicle }: { vehicle: ActiveVehicleListing }) {
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
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            {vehicle.color}
            <span aria-hidden>·</span>
            <Users className="size-3.5" /> {vehicle.seats}
          </span>
        </div>
      </Card>
    </Link>
  );
}
