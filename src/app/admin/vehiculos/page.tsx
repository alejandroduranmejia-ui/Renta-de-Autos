import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { vehicleDocuments, vehicles } from "@/lib/db/schema";
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
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <div>
                <p className="font-medium">
                  {d.make} {d.model} ({d.plate})
                </p>
                <p className="text-sm text-muted-foreground">
                  {d.documentType}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={reviewVehicleDocument}>
                  <input type="hidden" name="documentId" value={d.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button
                    type="submit"
                    className="rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-success-foreground"
                  >
                    Aprobar
                  </button>
                </form>
                <form action={reviewVehicleDocument}>
                  <input type="hidden" name="documentId" value={d.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <button
                    type="submit"
                    className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Rechazar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
