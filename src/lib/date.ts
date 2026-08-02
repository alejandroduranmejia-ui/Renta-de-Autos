// Conversión entre `Date` y la cadena "YYYY-MM-DD" que viaja por la URL y los formularios.
//
// Las dos direcciones tienen que ser locales, no UTC, o el día se corre:
//
// - `new Date("2026-09-10")` se parsea como medianoche UTC. En Colombia (UTC−5) eso es el
//   2026-09-09 19:00 local, y el calendario pinta "9 de sept" cuando el usuario pidió el 10
//   (verificado en vivo el 2026-08-02 sobre /vehiculos?from=2026-09-10).
// - `date.toISOString().slice(0,10)` sobre una medianoche local devuelve el día correcto solo en
//   husos al oeste de UTC; en UTC+ adelanta un día.
//
// Ambas funciones trabajan sobre el calendario local, que es el único que le importa a alguien
// eligiendo fechas de renta en su propia ciudad.

// El piloto opera en una sola ciudad (blueprint.md §1: multi-ciudad es non-goal), así que la zona
// horaria del vehículo es una constante. Vivía escrita a mano dentro de `createBookingCore`.
export const VEHICLE_TIMEZONE = "America/Bogota";

/** Límite de un día del calendario, expresado como instante UTC de esos mismos componentes.
 *
 * Es la convención que ya usa `computeSlots` para decidir si una excepción tapa un día
 * (`Date.UTC(year, month-1, day)`), así que las excepciones que escribimos tienen que usar la
 * misma o el bloqueo se corre a los días vecinos. */
export function utcDayBounds(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return {
    startsAt: new Date(Date.UTC(year, month - 1, day, 0, 0, 0)),
    endsAt: new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0)),
  };
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
