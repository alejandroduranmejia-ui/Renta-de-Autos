import { describe, expect, it } from "vitest";
import { parseIsoDate, toIsoDate } from "@/lib/date";

describe("parseIsoDate", () => {
  it("devuelve el día del calendario local, no el de UTC", () => {
    // La regresión concreta: `new Date("2026-09-10")` es medianoche UTC, que en Colombia
    // (UTC−5) cae el 9 de septiembre. La barra de búsqueda pintaba "9 de sept" cuando la URL
    // decía 2026-09-10 (verificado en vivo el 2026-08-02).
    const date = parseIsoDate("2026-09-10");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(8); // septiembre, 0-indexado
    expect(date?.getDate()).toBe(10);
  });

  it("rechaza lo que no sea YYYY-MM-DD", () => {
    expect(parseIsoDate("")).toBeUndefined();
    expect(parseIsoDate("10/09/2026")).toBeUndefined();
    expect(parseIsoDate("2026-09-10T00:00:00Z")).toBeUndefined();
  });
});

describe("toIsoDate", () => {
  it("serializa el día local sin correrlo", () => {
    expect(toIsoDate(new Date(2026, 8, 10))).toBe("2026-09-10");
  });

  it("rellena mes y día con cero a la izquierda", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("es la inversa exacta de parseIsoDate", () => {
    for (const value of ["2026-01-01", "2026-09-10", "2026-12-31"]) {
      const parsed = parseIsoDate(value);
      expect(parsed).toBeDefined();
      expect(parsed && toIsoDate(parsed)).toBe(value);
    }
  });
});
