import { Check } from "lucide-react";
import { groupFeatures } from "@/lib/vehicle-features";

export function VehicleFeatures({ features }: { features: string[] }) {
  const groups = groupFeatures(features);
  if (groups.length === 0) return null;

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="flex flex-col gap-5 border-t border-border pt-6">
      <h2 className="font-medium text-foreground">Características ({total})</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">
              {group.label}
            </h3>
            <ul className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="size-3.5 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
