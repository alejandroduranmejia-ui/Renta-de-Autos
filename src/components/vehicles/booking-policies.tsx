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
    <section className="flex flex-col gap-4 border-t border-border pt-6">
      <h2 className="flex items-center gap-2 font-medium text-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
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

export function BookingPolicies() {
  return (
    <>
      <Section
        icon={Sparkles}
        title="Incluido en el precio"
        items={INCLUDED_IN_PRICE}
      />
      <Section icon={CircleAlert} title="Reglas de uso" items={RULES_OF_USE} />
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="flex items-center gap-2 font-medium text-foreground">
          <CalendarX2 className="size-4 text-primary" />
          {CANCELLATION_POLICY.title}
        </h2>
        <ul className="flex flex-col gap-2">
          {CANCELLATION_POLICY.points.map((point) => (
            <li key={point} className="text-sm text-muted-foreground">
              {point}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
