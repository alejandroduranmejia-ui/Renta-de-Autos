import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { vehicleDocuments, vehiclePhotos, vehicles } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";
import {
  activateVehicle,
  addVehicleDocument,
  addVehiclePhoto,
  deactivateVehicle,
  updateVehicle,
} from "@/server/vehicles/mutations";

const ERROR_MESSAGES: Record<string, string> = {
  identity_not_approved: "Tu identidad todavía no está aprobada.",
  documents_missing_or_not_approved:
    "Faltan documentos del vehículo o aún no están aprobados (tarjeta de circulación y póliza de seguro).",
  payouts_not_enabled:
    "Tu cuenta de pagos todavía no está lista para recibir transferencias.",
  archivo_requerido: "Selecciona un archivo.",
};

export default async function EditarVehiculoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const { error, guardado } = await searchParams;

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1);
  if (!vehicle || vehicle.ownerId !== actor.id) {
    notFound();
  }

  const photos = await db
    .select()
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, id));
  const documents = await db
    .select()
    .from(vehicleDocuments)
    .where(eq(vehicleDocuments.vehicleId, id));

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">
          {vehicle.make} {vehicle.model}
        </h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs">
          {vehicle.status}
        </span>
      </div>

      {guardado && <p className="text-sm text-success">Guardado.</p>}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error] ?? "Ocurrió un error."}
        </p>
      )}

      <form action={updateVehicle} className="flex flex-col gap-3">
        <input type="hidden" name="vehicleId" value={vehicle.id} />
        <label className="flex flex-col gap-1 text-sm">
          Precio por día (COP)
          <input
            type="number"
            name="dailyPriceCents"
            defaultValue={vehicle.dailyPriceCents}
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Descripción
          <textarea
            name="description"
            defaultValue={vehicle.description ?? ""}
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl border border-input px-4 py-2 text-sm font-medium"
        >
          Guardar cambios
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Fotos ({photos.length})</h2>
        <form action={addVehiclePhoto} className="flex flex-col gap-2">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <input type="file" name="file" accept="image/*" required />
          <button
            type="submit"
            className="self-start rounded-lg border border-input px-3 py-1.5 text-sm"
          >
            Subir foto
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Documentos</h2>
        <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
          {documents.map((d) => (
            <li key={d.id}>
              {d.documentType}: {d.status}
            </li>
          ))}
        </ul>
        <form action={addVehicleDocument} className="flex flex-col gap-2">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <select
            name="documentType"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          >
            <option value="tarjeta_circulacion">Tarjeta de circulación</option>
            <option value="poliza_seguro">Póliza de seguro</option>
          </select>
          <input
            type="file"
            name="file"
            accept="image/*,application/pdf"
            required
          />
          <button
            type="submit"
            className="self-start rounded-lg border border-input px-3 py-1.5 text-sm"
          >
            Subir documento
          </button>
        </form>
      </section>

      <div className="flex gap-3">
        {vehicle.status !== "active" && (
          <form action={activateVehicle}>
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <button
              type="submit"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Activar publicación
            </button>
          </form>
        )}
        {vehicle.status !== "inactive" && (
          <form action={deactivateVehicle}>
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <button
              type="submit"
              className="rounded-xl border border-input px-4 py-2 text-sm"
            >
              Desactivar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
