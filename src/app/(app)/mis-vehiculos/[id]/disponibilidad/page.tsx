import { and, asc, eq } from "drizzle-orm";
import { CalendarOff } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toIsoDate } from "@/lib/date";
import { db } from "@/lib/db";
import { availabilityExceptions, vehicles } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";
import {
  blockVehicleDates,
  unblockVehicleDates,
} from "@/server/vehicles/mutations";

function formatRange(startsAt: Date, endsAt: Date) {
  const format = (date: Date) =>
    new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  // `endsAt` es el límite exclusivo del día siguiente (ver `utcDayBounds`), así que el último día
  // bloqueado es el anterior.
  const lastDay = new Date(endsAt.getTime() - 1);
  return `${format(startsAt)} – ${format(lastDay)}`;
}

export default async function DisponibilidadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardado?: string }>;
}) {
  const actor = await requireUser();
  const [{ id }, { guardado }] = await Promise.all([params, searchParams]);

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  // 404 tanto si no existe como si no es tuyo — 403 confirmaría que existe.
  if (!vehicle || vehicle.ownerId !== actor.id) notFound();

  const blocks = await db
    .select()
    .from(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.vehicleId, id),
        eq(availabilityExceptions.type, "block"),
      ),
    )
    .orderBy(asc(availabilityExceptions.startsAt));

  const today = toIsoDate(new Date());

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-foreground">
          Disponibilidad
        </h1>
        <p className="text-sm text-muted-foreground">
          {vehicle.make} {vehicle.model} — bloquea los días en que no puedes
          entregar el vehículo. Nadie podrá reservarlos.
        </p>
      </div>

      {guardado && <p className="text-sm text-success">Fechas bloqueadas.</p>}

      <form action={blockVehicleDates} className="flex flex-col gap-4">
        <input type="hidden" name="vehicleId" value={vehicle.id} />
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="from">Desde</Label>
            <Input id="from" name="from" type="date" min={today} required />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="to">Hasta</Label>
            <Input id="to" name="to" type="date" min={today} required />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">Motivo (opcional)</Label>
          <Input
            id="reason"
            name="reason"
            placeholder="Viaje, mantenimiento…"
            maxLength={200}
          />
        </div>
        <Button type="submit" className="self-start">
          Bloquear fechas
        </Button>
      </form>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="font-medium text-foreground">
          Bloqueos activos ({blocks.length})
        </h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No has bloqueado ninguna fecha. Tu vehículo está disponible todos
            los días que no tengan una reserva.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarOff className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">
                      {formatRange(block.startsAt, block.endsAt)}
                    </span>
                    {block.reason && (
                      <span className="text-xs text-muted-foreground">
                        {block.reason}
                      </span>
                    )}
                  </div>
                </div>
                <form action={unblockVehicleDates}>
                  <input type="hidden" name="vehicleId" value={vehicle.id} />
                  <input type="hidden" name="exceptionId" value={block.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Quitar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
