import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PublicationChecklist } from "@/components/vehicles/publication-checklist";
import { VehicleDiscoveryFields } from "@/components/vehicles/vehicle-fields";
import { db } from "@/lib/db";
import {
  connectedAccounts,
  identityVerifications,
  vehicleDocuments,
  vehiclePhotos,
  vehicles,
} from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";
import {
  activateVehicle,
  addVehicleDocument,
  addVehiclePhoto,
  deactivateVehicle,
  updateVehicle,
} from "@/server/vehicles/mutations";
import {
  MIN_PHOTOS_TO_ACTIVATE,
  REQUIRED_DOCUMENT_TYPES,
} from "@/server/vehicles/service";

const ERROR_MESSAGES: Record<string, string> = {
  identity_not_approved: "Tu identidad todavía no está aprobada.",
  documents_missing_or_not_approved:
    "Faltan documentos del vehículo o aún no están aprobados (tarjeta de circulación y póliza de seguro).",
  payouts_not_enabled:
    "Tu cuenta de pagos todavía no está lista para recibir transferencias.",
  photos_missing: `Necesitas al menos ${MIN_PHOTOS_TO_ACTIVATE} fotos para activar la publicación.`,
  archivo_requerido: "Selecciona un archivo.",
  archivo_vacio: "El archivo está vacío.",
  archivo_muy_grande: "El archivo supera los 10 MB.",
  tipo_no_permitido:
    "Solo se aceptan imágenes JPG, PNG o WEBP — y PDF para los documentos. Revisamos el contenido real del archivo, no su nombre.",
  demasiados_intentos: "Demasiadas subidas seguidas. Espera unos minutos.",
};

const DOCUMENT_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
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

  const [identity] = await db
    .select({ id: identityVerifications.id })
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.userId, actor.id),
        eq(identityVerifications.status, "approved"),
      ),
    )
    .limit(1);
  const [connected] = await db
    .select({ payoutsEnabled: connectedAccounts.payoutsEnabled })
    .from(connectedAccounts)
    .where(eq(connectedAccounts.ownerId, actor.id))
    .limit(1);

  const approvedDocumentTypes = new Set(
    documents.filter((d) => d.status === "approved").map((d) => d.documentType),
  ).size;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">
          {vehicle.make} {vehicle.model}
        </h1>
        <Badge variant="secondary">{vehicle.status}</Badge>
      </div>

      <PublicationChecklist
        state={{
          identityApproved: Boolean(identity),
          photoCount: photos.length,
          approvedDocumentTypes,
          requiredDocumentTypes: REQUIRED_DOCUMENT_TYPES.length,
          payoutsEnabled: Boolean(connected?.payoutsEnabled),
        }}
      />

      <Button variant="outline" asChild className="self-start">
        <Link href={`/mis-vehiculos/${vehicle.id}/disponibilidad`}>
          Gestionar disponibilidad
        </Link>
      </Button>

      {guardado && <p className="text-sm text-success">Guardado.</p>}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error] ?? "Ocurrió un error."}
        </p>
      )}

      <form action={updateVehicle} className="flex flex-col gap-4">
        <input type="hidden" name="vehicleId" value={vehicle.id} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dailyPriceCents">Precio por día (COP)</Label>
          <Input
            id="dailyPriceCents"
            type="number"
            name="dailyPriceCents"
            defaultValue={vehicle.dailyPriceCents}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Descripción</Label>
          <textarea
            id="description"
            name="description"
            defaultValue={vehicle.description ?? ""}
            className="min-h-24 rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <VehicleDiscoveryFields defaults={vehicle} />
        <Button type="submit" variant="outline" className="self-start">
          Guardar cambios
        </Button>
      </form>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Fotos ({photos.length})</h2>
        <form action={addVehiclePhoto} className="flex flex-col gap-2">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <Input type="file" name="file" accept="image/*" multiple required />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="self-start"
          >
            Subir foto
          </Button>
        </form>
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground">Documentos</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className="text-muted-foreground">{d.documentType}</span>
              <Badge variant={DOCUMENT_STATUS_VARIANT[d.status]}>
                {d.status}
              </Badge>
            </li>
          ))}
        </ul>
        <form action={addVehicleDocument} className="flex flex-col gap-2">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <Select
            name="documentType"
            required
            defaultValue="tarjeta_circulacion"
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tarjeta_circulacion">
                Tarjeta de circulación
              </SelectItem>
              <SelectItem value="poliza_seguro">Póliza de seguro</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="file"
            name="file"
            accept="image/*,application/pdf"
            required
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="self-start"
          >
            Subir documento
          </Button>
        </form>
      </section>

      <Separator />

      <div className="flex gap-3">
        {vehicle.status !== "active" && (
          <form action={activateVehicle}>
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <Button type="submit">Activar publicación</Button>
          </form>
        )}
        {vehicle.status !== "inactive" && (
          <form action={deactivateVehicle}>
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <Button type="submit" variant="outline">
              Desactivar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
