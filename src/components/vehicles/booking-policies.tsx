import { CalendarX2, CircleAlert, Sparkles } from "lucide-react";
import {
  CANCELLATION_POLICY,
  INCLUDED_IN_PRICE,
  RULES_OF_USE,
} from "@/lib/policies";

function Section({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Sparkles;
  title: string;
  items: readonly { title: string; description: string }[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </h3>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.title} className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">
              {item.title}
            </span>
            <span className="text-sm text-muted-foreground">
              {item.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// Ritmo: estos tres bloques son letra chica útil, no el argumento de venta. Antes competían de
// igual a igual con el anfitrión y las características —mismo tamaño de título, mismo separador—
// y la ficha se leía como una lista plana. Ahora van agrupados bajo un solo encabezado, con
// títulos de menor jerarquía dentro.
export function BookingPolicies() {
  return (
    <section className="flex flex-col gap-8 border-t border-border pt-8">
      <h2 className="text-lg font-medium text-foreground">Antes de reservar</h2>

      <Section
        icon={Sparkles}
        title="Incluido en el precio"
        items={INCLUDED_IN_PRICE}
      />
      <Section icon={CircleAlert} title="Reglas de uso" items={RULES_OF_USE} />

      <div className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarX2 className="size-4 text-muted-foreground" />
          {CANCELLATION_POLICY.title}
        </h3>
        <ul className="flex flex-col gap-2">
          {CANCELLATION_POLICY.points.map((point) => (
            <li key={point} className="text-sm text-muted-foreground">
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
