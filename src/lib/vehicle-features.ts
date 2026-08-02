// Características que un dueño puede declarar de su vehículo. Lista blanca cerrada: el mutation
// valida contra estas claves con Zod, así que nada arbitrario llega a la columna `features`.
//
// Agrupadas como en las fichas de Turo (seguridad / conectividad / comodidad) porque una lista
// plana de 20 ítems no se lee; agrupada se escanea.

export const FEATURE_GROUPS = {
  seguridad: {
    label: "Seguridad",
    features: {
      camara_reversa: "Cámara de reversa",
      sensores_parqueo: "Sensores de parqueo",
      frenos_abs: "Frenos ABS",
      airbags_laterales: "Airbags laterales",
      control_estabilidad: "Control de estabilidad",
      alarma: "Alarma",
    },
  },
  conectividad: {
    label: "Conectividad",
    features: {
      bluetooth: "Bluetooth",
      apple_carplay: "Apple CarPlay",
      android_auto: "Android Auto",
      usb: "Puerto USB",
      pantalla_tactil: "Pantalla táctil",
      gps: "GPS integrado",
    },
  },
  comodidad: {
    label: "Comodidad",
    features: {
      aire_acondicionado: "Aire acondicionado",
      vidrios_electricos: "Vidrios eléctricos",
      sillas_cuero: "Sillas de cuero",
      sunroof: "Sunroof",
      silla_bebe: "Silla para bebé",
      portaequipajes: "Portaequipajes",
    },
  },
} as const;

export type FeatureGroupKey = keyof typeof FEATURE_GROUPS;

const ALL_FEATURES: Record<string, string> = Object.assign(
  {},
  ...Object.values(FEATURE_GROUPS).map((group) => group.features),
);

export const FEATURE_KEYS = Object.keys(ALL_FEATURES) as [string, ...string[]];

export function featureLabel(key: string): string | null {
  return ALL_FEATURES[key] ?? null;
}

/** Agrupa las claves declaradas por un vehículo, descartando grupos vacíos y claves que ya no
 * existen en la lista blanca (una característica retirada no debe romper una ficha antigua). */
export function groupFeatures(keys: string[]) {
  const selected = new Set(keys);
  return Object.entries(FEATURE_GROUPS)
    .map(([groupKey, group]) => ({
      key: groupKey,
      label: group.label,
      items: Object.entries(group.features)
        .filter(([featureKey]) => selected.has(featureKey))
        .map(([, label]) => label),
    }))
    .filter((group) => group.items.length > 0);
}
