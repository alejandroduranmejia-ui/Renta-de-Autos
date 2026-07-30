// Motor de disponibilidad — función pura, sin I/O, con el reloj inyectado (blueprint.md §9,
// paso 7). Nunca materializa una tabla de slots: calcula a partir de reglas + excepciones +
// reservas existentes en cada lectura (knowledge/capabilities/availability-engine.md).
//
// Para este proyecto, un "slot" es una ventana de recogida disponible en un día dado, expresada
// como el instante UTC de apertura/cierre de ese día según la regla semanal del vehículo. La
// reserva real cubre un rango de varios días — este cálculo decide si el día de recogida está
// abierto y libre; el exclusion constraint de la base de datos (paso 3) es la autoridad final
// contra condiciones de carrera, esto es solo advisorio para la UI.

export type AvailabilityRule = {
  weekday: number; // 0-6, domingo=0
  startTime: string; // "HH:MM:SS", hora local de pared
  endTime: string;
  validFrom?: string | null;
  validUntil?: string | null;
};

export type AvailabilityException = {
  startsAt: Date;
  endsAt: Date;
  type: "block" | "open";
};

export type ExistingBooking = {
  startsAt: Date;
  endsAt: Date;
};

export type Slot = {
  date: string; // YYYY-MM-DD en la zona del vehículo
  opensAt: Date | null; // instante UTC de apertura, o null si el día no tiene slot
  closesAt: Date | null;
  available: boolean;
};

function partsInZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: weekdayMap[get("weekday")],
  };
}

// Convierte una hora de pared local ("HH:MM:SS" en `timeZone`, en el día year-month-day) a un
// instante UTC. Si esa hora local no existe (salto de primavera) o es ambigua (regreso de
// otoño), usa el offset detectado para el instante candidato — que naturalmente produce "no
// existe, se salta" y "existe dos veces, toma la primera" al recorrer día por día, sin lógica
// especial adicional: el mismo instante candidato, reinterpretado, converge.
function localWallClockToUtc(
  year: number,
  month: number,
  day: number,
  time: string,
  timeZone: string,
): Date | null {
  const [h, m, s] = time.split(":").map(Number);
  // Primer candidato: interpretar como si timeZone === UTC, luego corregir por el offset real.
  const naiveUtc = Date.UTC(year, month - 1, day, h, m, s ?? 0);
  const tzDate = new Date(naiveUtc);
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = offsetFormatter.formatToParts(tzDate);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const observedUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = observedUtc - naiveUtc;
  const candidate = new Date(naiveUtc - offsetMs);

  // Verifica que la hora local resultante, leída de vuelta en timeZone, coincide con la pedida.
  // Si no coincide (típico del salto de primavera, donde esa hora local no existe), no hay slot.
  const verify = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(candidate);
  const vh = Number(verify.find((p) => p.type === "hour")?.value ?? -1);
  const vm = Number(verify.find((p) => p.type === "minute")?.value ?? -1);
  if (vh !== h || vm !== m) {
    return null;
  }
  return candidate;
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function computeSlots(params: {
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  existingBookings: ExistingBooking[];
  now: Date;
  vehicleTimeZone: string;
  rangeStartDays: number; // días desde `now`
  rangeEndDays: number;
  minNoticeHours?: number;
}): Slot[] {
  const {
    rules,
    exceptions,
    existingBookings,
    now,
    vehicleTimeZone,
    rangeStartDays,
    rangeEndDays,
    minNoticeHours = 0,
  } = params;

  const slots: Slot[] = [];
  const minNoticeMs = minNoticeHours * 60 * 60 * 1000;

  for (let offset = rangeStartDays; offset <= rangeEndDays; offset++) {
    const probe = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const { year, month, day, weekday } = partsInZone(probe, vehicleTimeZone);
    const key = dateKey(year, month, day);

    const rule = rules.find((r) => {
      if (r.weekday !== weekday) return false;
      if (r.validFrom && key < r.validFrom) return false;
      if (r.validUntil && key > r.validUntil) return false;
      return true;
    });

    if (!rule) {
      slots.push({
        date: key,
        opensAt: null,
        closesAt: null,
        available: false,
      });
      continue;
    }

    const opensAt = localWallClockToUtc(
      year,
      month,
      day,
      rule.startTime,
      vehicleTimeZone,
    );
    const closesAt = localWallClockToUtc(
      year,
      month,
      day,
      rule.endTime,
      vehicleTimeZone,
    );

    // Salto de primavera: la hora de apertura o cierre de esa regla no existe ese día — sin slot.
    if (!opensAt || !closesAt) {
      slots.push({
        date: key,
        opensAt: null,
        closesAt: null,
        available: false,
      });
      continue;
    }

    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

    const blocked = exceptions.some(
      (e) => e.type === "block" && e.startsAt < dayEnd && e.endsAt > dayStart,
    );
    const busy = existingBookings.some(
      (b) => b.startsAt < closesAt && b.endsAt > opensAt,
    );
    const tooSoon = opensAt.getTime() - now.getTime() < minNoticeMs;

    slots.push({
      date: key,
      opensAt,
      closesAt,
      available: !blocked && !busy && !tooSoon,
    });
  }

  return slots;
}
