import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";

export default async function MisVehiculosPage() {
  const actor = await requireUser();
  const own = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.ownerId, actor.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Mis vehículos</h1>
        <Link
          href="/mis-vehiculos/nuevo"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Publicar vehículo
        </Link>
      </div>

      {own.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no has publicado ningún vehículo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {own.map((v) => (
            <li key={v.id}>
              <Link
                href={`/mis-vehiculos/${v.id}/editar`}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
              >
                <span>
                  {v.make} {v.model} ({v.year})
                </span>
                <span className="text-sm text-muted-foreground">
                  {v.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
