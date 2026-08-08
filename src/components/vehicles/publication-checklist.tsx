import { Check, CircleAlert } from "lucide-react";
import { MIN_PHOTOS_TO_ACTIVATE } from "@/server/vehicles/service";

export type ChecklistState = {
  identityApproved: boolean;
  photoCount: number;
  approvedDocumentTypes: number;
  requiredDocumentTypes: number;
  payoutsEnabled: boolean;
};

// Hasta ahora el dueño solo descubría qué le faltaba apretando "Activar" y leyendo el error de la
// primera condición que fallaba — una a la vez. Esto muestra las cuatro juntas, en el mismo orden
// que las evalúa `activateVehicleCore`.
export function PublicationChecklist({ state }: { state: ChecklistState }) {
  const items = [
    {
      label: "Identidad verificada",
      done: state.identityApproved,
      pending: "Sube tu cédula o licencia en Verificación.",
    },
    {
      label: `Fotos (${state.photoCount}/${MIN_PHOTOS_TO_ACTIVATE})`,
      done: state.photoCount >= MIN_PHOTOS_TO_ACTIVATE,
      pending: `Faltan ${Math.max(0, MIN_PHOTOS_TO_ACTIVATE - state.photoCount)} — súbelas abajo.`,
    },
    {
      label: `Documentos aprobados (${state.approvedDocumentTypes}/${state.requiredDocumentTypes})`,
      done: state.approvedDocumentTypes >= state.requiredDocumentTypes,
      pending: "Tarjeta de circulación y póliza, ambas aprobadas por un admin.",
    },
    {
      label: "Cuenta de pagos lista",
      done: state.payoutsEnabled,
      pending: "Completa el registro de pagos para poder recibir el dinero.",
    },
  ];

  const remaining = items.filter((item) => !item.done).length;

  return (
    <section className="flex flex-col gap-3 surface p-4">
      <h2 className="font-medium text-card-foreground">
        {remaining === 0
          ? "Todo listo para activar"
          : `Falta ${remaining} ${remaining === 1 ? "cosa" : "cosas"} para activar`}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            {item.done ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
            ) : (
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="flex flex-col">
              <span
                className={
                  item.done
                    ? "text-sm text-card-foreground"
                    : "text-sm font-medium text-card-foreground"
                }
              >
                {item.label}
              </span>
              {!item.done && (
                <span className="text-xs text-muted-foreground">
                  {item.pending}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
