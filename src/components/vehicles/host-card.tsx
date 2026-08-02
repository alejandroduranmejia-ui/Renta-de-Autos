import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { VehicleHost } from "@/server/vehicles/queries";

function initials(fullName: string) {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function memberSinceLabel(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(date);
}

// En un marketplace entre particulares, media decisión de compra es "¿quién es esta persona?".
// La ficha no mencionaba al dueño por ningún lado hasta ahora.
export function HostCard({ host }: { host: VehicleHost }) {
  const trips =
    host.completedTrips === 1
      ? "1 renta completada"
      : `${host.completedTrips} rentas completadas`;

  return (
    <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <Avatar className="size-14">
        {host.avatarUrl && <AvatarImage src={host.avatarUrl} alt="" />}
        <AvatarFallback>{initials(host.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">Publicado por</span>
        <span className="font-medium text-card-foreground">
          {host.fullName}
        </span>
        <span className="text-sm text-muted-foreground">
          {host.completedTrips > 0 && <>{trips} · </>}
          Miembro desde {memberSinceLabel(host.memberSince)}
        </span>
      </div>
    </section>
  );
}
