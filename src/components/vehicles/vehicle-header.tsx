import { Car, Cog, Fuel, MapPin, Palette, Users } from "lucide-react";
import {
  FUEL_TYPES,
  labelFor,
  TRANSMISSIONS,
  VEHICLE_TYPES,
} from "@/lib/vehicle-taxonomy";
import type { VehicleDetail } from "@/server/vehicles/queries";

// Chips de especificaciones al estilo de la ficha de Turo. Los campos de la migración 0004 son
// nullable, así que cada chip solo aparece si el dueño declaró el dato — nunca "Sin especificar".
export function VehicleHeader({ vehicle }: { vehicle: VehicleDetail }) {
  const chips = [
    { icon: Palette, value: vehicle.color },
    { icon: Users, value: `${vehicle.seats} puestos` },
    { icon: Car, value: labelFor(VEHICLE_TYPES, vehicle.vehicleType) },
    { icon: Cog, value: labelFor(TRANSMISSIONS, vehicle.transmission) },
    { icon: Fuel, value: labelFor(FUEL_TYPES, vehicle.fuelType) },
  ].filter((chip): chip is { icon: typeof Car; value: string } =>
    Boolean(chip.value),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">
        {vehicle.make} {vehicle.model} ({vehicle.year})
      </h1>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.value}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground"
          >
            <chip.icon className="size-3.5" />
            {chip.value}
          </span>
        ))}
      </div>

      {vehicle.zone && (
        <p className="mt-4 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>
            Se entrega en {vehicle.zone}
            {vehicle.pickupNotes && ` — ${vehicle.pickupNotes}`}
            {/* Zona aproximada, nunca la dirección exacta antes de reservar: eso se acuerda por
                el chat de la reserva, igual que en Turo. */}
          </span>
        </p>
      )}
    </div>
  );
}
