import { describe, expect, it } from "vitest";
import { computeSlots } from "@/server/bookings/availability";

const ZONES = ["America/New_York", "Australia/Sydney", "Asia/Kolkata", "UTC"];

describe("availability engine", () => {
  it.each(ZONES)(
    "generates slots across a week in %s with identical logic",
    (zone) => {
      const now = new Date("2026-01-05T00:00:00Z");
      const rules = [
        { weekday: 1, startTime: "09:00:00", endTime: "18:00:00" }, // lunes
        { weekday: 3, startTime: "09:00:00", endTime: "18:00:00" }, // miércoles
      ];

      // rangeStartDays empieza en 1 (mañana), no 0 (hoy): a las 00:00 UTC de `now`, un huso muy
      // adelantado (Sídney, UTC+11 en enero) ya está pasado el mediodía local — el slot de las
      // 9am de "hoy" legítimamente ya pasó ahí y quedaría "no disponible", contaminando esta
      // prueba de generación con el comportamiento — correcto, pero distinto — de corte por hora
      // actual (verificado en vivo: era exactamente lo que fallaba en Australia/Sydney).
      const slots = computeSlots({
        rules,
        exceptions: [],
        existingBookings: [],
        now,
        vehicleTimeZone: zone,
        rangeStartDays: 1,
        rangeEndDays: 14,
      });

      expect(slots.length).toBe(14);
      const openDays = slots.filter((s) => s.opensAt !== null);
      // Dos días de regla por semana, dos semanas en el rango.
      expect(openDays.length).toBe(4);
      for (const s of openDays) {
        expect(s.available).toBe(true);
      }
    },
  );

  it("produces zero slots for the nonexistent local hour on the US spring-forward boundary", () => {
    // 2026-03-08 en America/New_York: 02:00 salta a 03:00 — 02:30 no existe ese día.
    const now = new Date("2026-03-01T00:00:00Z");
    const rules = [{ weekday: 0, startTime: "02:30:00", endTime: "03:30:00" }]; // domingo
    const slots = computeSlots({
      rules,
      exceptions: [],
      existingBookings: [],
      now,
      vehicleTimeZone: "America/New_York",
      rangeStartDays: 0,
      rangeEndDays: 10,
    });

    const springForwardDay = slots.find((s) => s.date === "2026-03-08");
    expect(springForwardDay?.opensAt).toBeNull();
    expect(springForwardDay?.available).toBe(false);
  });

  it("removes exactly the blocked day's slots and leaves adjacent days unchanged", () => {
    const now = new Date("2026-01-05T00:00:00Z");
    const rules = [
      { weekday: 1, startTime: "09:00:00", endTime: "18:00:00" },
      { weekday: 2, startTime: "09:00:00", endTime: "18:00:00" },
      { weekday: 3, startTime: "09:00:00", endTime: "18:00:00" },
    ];
    // Bloquea el martes 2026-01-06 completo.
    const exceptions = [
      {
        startsAt: new Date("2026-01-06T00:00:00Z"),
        endsAt: new Date("2026-01-07T00:00:00Z"),
        type: "block" as const,
      },
    ];

    const slots = computeSlots({
      rules,
      exceptions,
      existingBookings: [],
      now,
      vehicleTimeZone: "UTC",
      rangeStartDays: 0,
      rangeEndDays: 6,
    });

    const monday = slots.find((s) => s.date === "2026-01-05");
    const tuesday = slots.find((s) => s.date === "2026-01-06");
    const wednesday = slots.find((s) => s.date === "2026-01-07");

    expect(monday?.available).toBe(true);
    expect(tuesday?.available).toBe(false);
    expect(wednesday?.available).toBe(true);
  });

  // Regresión con el reloj fijo. El test de integración que destapó esto solo falla si la suite
  // corre entre las 22:00 y la medianoche, así que pasó limpio tres veces el mismo día antes de
  // romperse. Con `now` inyectado, el caso queda cubierto a cualquier hora.
  it("no bloquea el día siguiente por acercarse la medianoche", () => {
    // 23:04 del 7 de agosto en Bogotá (UTC-5).
    const now = new Date("2026-08-08T04:04:00Z");
    const rules = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      startTime: "00:00:00",
      endTime: "23:59:00",
    }));

    const slots = computeSlots({
      rules,
      exceptions: [],
      existingBookings: [],
      now,
      vehicleTimeZone: "America/Bogota",
      rangeStartDays: 0,
      rangeEndDays: 2,
      minNoticeHours: 2,
    });

    const hoy = slots.find((s) => s.date === "2026-08-07");
    const manana = slots.find((s) => s.date === "2026-08-08");

    // Hoy ya no da: su ventana cierra en 55 minutos, menos que el aviso mínimo.
    expect(hoy?.available).toBe(false);
    // Mañana sí: reservar para mañana al mediodía da 13 horas de aviso, de sobra. Antes se
    // bloqueaba porque la medianoche —su hora de apertura— quedaba a 56 minutos.
    expect(manana?.available).toBe(true);
  });
});
