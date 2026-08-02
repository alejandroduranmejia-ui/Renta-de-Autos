import { describe, expect, it } from "vitest";
import {
  FEATURE_KEYS,
  featureLabel,
  groupFeatures,
} from "@/lib/vehicle-features";

describe("groupFeatures", () => {
  it("agrupa las claves declaradas y descarta los grupos vacíos", () => {
    const groups = groupFeatures(["bluetooth", "apple_carplay"]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Conectividad");
    expect(groups[0].items).toEqual(["Bluetooth", "Apple CarPlay"]);
  });

  it("reparte las claves entre varios grupos", () => {
    const groups = groupFeatures(["camara_reversa", "sunroof", "bluetooth"]);
    expect(groups.map((g) => g.label)).toEqual([
      "Seguridad",
      "Conectividad",
      "Comodidad",
    ]);
  });

  it("ignora una clave desconocida en vez de romper la ficha", () => {
    // Si una característica se retira de la lista blanca, las fichas antiguas que la tengan
    // guardada deben seguir renderizando el resto.
    const groups = groupFeatures(["bluetooth", "caracteristica_retirada"]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toEqual(["Bluetooth"]);
  });

  it("devuelve vacío cuando el vehículo no declaró nada", () => {
    expect(groupFeatures([])).toEqual([]);
  });
});

describe("featureLabel", () => {
  it("tiene etiqueta para toda clave de la lista blanca", () => {
    // Es lo que garantiza que el formulario del dueño y la ficha no se desincronicen.
    for (const key of FEATURE_KEYS) {
      expect(featureLabel(key)).toBeTruthy();
    }
  });

  it("devuelve null para una clave que no existe", () => {
    expect(featureLabel("no_existe")).toBeNull();
  });
});
