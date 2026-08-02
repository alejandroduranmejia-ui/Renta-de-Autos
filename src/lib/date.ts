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
