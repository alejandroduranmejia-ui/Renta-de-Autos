import { eq } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { connectedAccounts, vehicles } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";
import { startConnectOnboarding } from "@/server/payments/mutations";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "outline",
  pending_review: "secondary",
  active: "default",
  inactive: "outline",
  rejected: "destructive",
};

export default async function MisVehiculosPage() {
  const actor = await requireUser();
  const own = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.ownerId, actor.id));
  const [connected] = await db
    .select()
    .from(connectedAccounts)
    .where(eq(connectedAccounts.ownerId, actor.id))
    .limit(1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Mis vehículos</h1>
        <Button asChild>
          <Link href="/mis-vehiculos/nuevo">Publicar vehículo</Link>
        </Button>
      </div>

      {!connected?.payoutsEnabled && (
        <form action={startConnectOnboarding} className="surface px-4 py-3">
          <p className="mb-2 text-sm text-muted-foreground">
            Para recibir pagos, primero configura tu cuenta de pagos.
          </p>
          <Button type="submit" variant="outline" size="sm">
            Configurar pagos
          </Button>
        </form>
      )}

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
                className="flex items-center justify-between surface px-4 py-3 transition-colors hover:bg-muted"
              >
                <span className="font-medium text-card-foreground">
                  {v.make} {v.model} ({v.year})
                </span>
                <span className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[v.status]}>{v.status}</Badge>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
