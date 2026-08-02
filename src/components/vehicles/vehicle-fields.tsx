import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FEATURE_GROUPS } from "@/lib/vehicle-features";
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_TYPES,
} from "@/lib/vehicle-taxonomy";

type Defaults = {
  zone?: string | null;
  pickupNotes?: string | null;
  vehicleType?: string | null;
  transmission?: string | null;
  fuelType?: string | null;
  features?: string[] | null;
};

const SELECTS = [
  { name: "vehicleType", label: "Tipo de vehículo", options: VEHICLE_TYPES },
  { name: "transmission", label: "Transmisión", options: TRANSMISSIONS },
  { name: "fuelType", label: "Combustible", options: FUEL_TYPES },
] as const;

// Compartido por el alta y la edición, para que un campo agregado aquí aparezca en las dos y no
// se olvide en una. Todos son opcionales: un vehículo se puede publicar sin ellos, solo pierde
// visibilidad en los filtros de búsqueda.
export function VehicleDiscoveryFields({ defaults }: { defaults?: Defaults }) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="zone">Zona</Label>
        <Input
          id="zone"
          name="zone"
          placeholder="Chapinero, Laureles, El Poblado…"
          defaultValue={defaults?.zone ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          El sector donde normalmente entregas el vehículo. Aparece en la
          búsqueda; la dirección exacta se coordina por chat después de
          reservar.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pickupNotes">Notas de entrega</Label>
        <Input
          id="pickupNotes"
          name="pickupNotes"
          placeholder="Frente al portal, parqueadero de visitantes"
          defaultValue={defaults?.pickupNotes ?? ""}
        />
      </div>

      {SELECTS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          <select
            id={field.name}
            name={field.name}
            defaultValue={defaults?.[field.name] ?? ""}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Sin especificar</option>
            {Object.entries(field.options).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ))}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-foreground">
          Características
        </legend>
        {Object.entries(FEATURE_GROUPS).map(([groupKey, group]) => (
          <div key={groupKey} className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{group.label}</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(group.features).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    name="features"
                    value={key}
                    defaultChecked={defaults?.features?.includes(key)}
                    className="size-4 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
    </>
  );
}
