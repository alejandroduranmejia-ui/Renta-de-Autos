// Vocabulario de descubrimiento. Estas claves son exactamente las de los `check` constraints de
// `vehicles` en src/lib/db/schema.ts — si cambias una aquí, va migración. Un solo lugar para que
// el formulario del dueño, los filtros de búsqueda y las etiquetas de la ficha no se desincronicen.

export const VEHICLE_TYPES = {
  sedan: "Sedán",
  suv: "SUV",
  hatchback: "Hatchback",
  pickup: "Pickup",
  van: "Van",
  camioneta: "Camioneta",
  deportivo: "Deportivo",
} as const;

export const TRANSMISSIONS = {
  automatica: "Automática",
  mecanica: "Mecánica",
} as const;

export const FUEL_TYPES = {
  gasolina: "Gasolina",
  diesel: "Diésel",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
  gas: "Gas",
} as const;

export type VehicleType = keyof typeof VEHICLE_TYPES;
export type Transmission = keyof typeof TRANSMISSIONS;
export type FuelType = keyof typeof FUEL_TYPES;

export const VEHICLE_TYPE_KEYS = Object.keys(VEHICLE_TYPES) as [
  VehicleType,
  ...VehicleType[],
];
export const TRANSMISSION_KEYS = Object.keys(TRANSMISSIONS) as [
  Transmission,
  ...Transmission[],
];
export const FUEL_TYPE_KEYS = Object.keys(FUEL_TYPES) as [
  FuelType,
  ...FuelType[],
];

// Etiqueta legible, o null si el vehículo no declaró el dato (columnas nullable a propósito: los
// vehículos publicados antes de la migración 0004 no lo tienen y no se inventa por backfill).
export function labelFor(
  dictionary: Record<string, string>,
  key: string | null,
): string | null {
  if (!key) return null;
  return dictionary[key] ?? null;
}
