import { eq } from "drizzle-orm";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { vehicleDocuments, vehicles } from "@/lib/db/schema";
import { openDocument } from "@/server/identity/mutations";
import { reviewVehicleDocument } from "@/server/vehicles/mutations";

export default async function AdminVehiculosPage() {
  const pending = await db
    .select({
      id: vehicleDocuments.id,
      documentType: vehicleDocuments.documentType,
      filePath: vehicleDocuments.filePath,
      make: vehicles.make,
      model: vehicles.model,
      plate: vehicles.plate,
    })
    .from(vehicleDocuments)
    .innerJoin(vehicles, eq(vehicles.id, vehicleDocuments.vehicleId))
    .where(eq(vehicleDocuments.status, "pending"));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        Documentos de vehículo pendientes ({pending.length})
      </h1>

      {pending.length === 0 ? (
        <p className="text-muted-foreground">
          No hay nada pendiente de revisar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between surface px-4 py-3"
            >
              <div>
                <p className="font-medium text-card-foreground">
                  {d.make} {d.model} ({d.plate})
                </p>
                <p className="text-sm text-muted-foreground">
                  {d.documentType}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Misma corrección que en /admin/verificaciones: aprobar una póliza sin poder
                    abrirla no es una revisión. */}
                <form action={openDocument} target="_blank" rel="noopener">
                  <input type="hidden" name="filePath" value={d.filePath} />
                  <input
                    type="hidden"
                    name="targetType"
                    value="vehicle_document"
                  />
                  <input type="hidden" name="targetId" value={d.id} />
                  <Button type="submit" size="sm" variant="outline">
                    <Eye className="size-4" />
                    Ver documento
                  </Button>
                </form>
                <form action={reviewVehicleDocument}>
                  <input type="hidden" name="documentId" value={d.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/80"
                  >
                    Aprobar
                  </Button>
                </form>
                <form action={reviewVehicleDocument}>
                  <input type="hidden" name="documentId" value={d.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <Button type="submit" size="sm" variant="destructive">
                    Rechazar
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
