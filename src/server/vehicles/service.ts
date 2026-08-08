import { and, eq } from "drizzle-orm";
import { utcDayBounds } from "@/lib/date";
import { db } from "@/lib/db";
import {
  availabilityExceptions,
  connectedAccounts,
  identityVerifications,
  vehicleDocuments,
  vehiclePhotos,
  vehicles,
} from "@/lib/db/schema";
import { uploadPrivate, uploadPublicPhoto } from "@/lib/storage";
import { validateUpload } from "@/lib/upload-validation";
import { ConflictError } from "@/server/bookings/service";
import { ForbiddenError, NotFoundError } from "@/server/errors";

// Capa de servicio — sin `cookies()`/`headers()`, recibe un actor ya resuelto (blueprint.md §9,
// "Toda mutación real vive en service.ts").

type Actor = { id: string };

async function getOwnedVehicleOrThrow(actor: Actor, vehicleId: string) {
  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);
  if (!vehicle || vehicle.ownerId !== actor.id) {
    // 404 para ambos casos (no existe / no es tuyo) — nunca se distingue, o confirmaría existencia.
    throw new NotFoundError("Vehículo no encontrado.");
  }
  return vehicle;
}

// Campos de descubrimiento agregados en la migración 0004 — opcionales en todas las capas: los
// vehículos publicados antes no los tienen y no se inventan.
type DiscoveryFields = {
  zone?: string;
  pickupNotes?: string;
  vehicleType?: string;
  transmission?: string;
  fuelType?: string;
  features?: string[];
};

export async function createVehicleCore(
  actor: Actor,
  params: {
    make: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    seats: number;
    dailyPriceCents: number;
    currency?: string;
    description?: string;
  } & DiscoveryFields,
) {
  const [created] = await db
    .insert(vehicles)
    .values({
      ownerId: actor.id,
      make: params.make,
      model: params.model,
      year: params.year,
      plate: params.plate,
      color: params.color,
      seats: params.seats,
      dailyPriceCents: params.dailyPriceCents,
      currency: params.currency ?? "COP",
      description: params.description,
      zone: params.zone,
      pickupNotes: params.pickupNotes,
      vehicleType: params.vehicleType,
      transmission: params.transmission,
      fuelType: params.fuelType,
      features: params.features,
      // "pending_review" desde que se crea — no hay un paso separado de "borrador sin enviar" en
      // este proyecto; queda esperando identidad + documentos aprobados para pasar a "active".
      status: "pending_review",
    })
    .returning();
  return created;
}

export async function updateVehicleCore(
  actor: Actor,
  vehicleId: string,
  params: Partial<{
    make: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    seats: number;
    dailyPriceCents: number;
    description: string;
  }> &
    DiscoveryFields,
) {
  await getOwnedVehicleOrThrow(actor, vehicleId);
  const [updated] = await db
    .update(vehicles)
    .set(params)
    .where(eq(vehicles.id, vehicleId))
    .returning();
  return updated;
}

export async function deactivateVehicleCore(actor: Actor, vehicleId: string) {
  await getOwnedVehicleOrThrow(actor, vehicleId);
  const [updated] = await db
    .update(vehicles)
    .set({ status: "inactive" })
    .where(eq(vehicles.id, vehicleId))
    .returning();
  return updated;
}

export async function addVehiclePhotoCore(
  actor: Actor,
  vehicleId: string,
  params: { file: Buffer; fileName: string; contentType: string },
) {
  await getOwnedVehicleOrThrow(actor, vehicleId);
  // Bucket PÚBLICO: sin esta validación, un dueño verificado podía subir un archivo HTML
  // declarándolo `image/jpeg` y obtener una URL pública que lo sirviera desde el dominio de
  // Supabase (auditoría del 2026-08-08). Aquí no se aceptan PDF: una foto es una foto.
  const { extension, mime } = validateUpload(params.file);
  const path = `${vehicleId}/${Date.now()}.${extension}`;
  await uploadPublicPhoto(path, params.file, mime);

  const existing = await db
    .select()
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId));

  const [created] = await db
    .insert(vehiclePhotos)
    .values({ vehicleId, storagePath: path, position: existing.length })
    .returning();
  return created;
}

export async function addVehicleDocumentCore(
  actor: Actor,
  vehicleId: string,
  params: {
    documentType: "tarjeta_circulacion" | "poliza_seguro";
    file: Buffer;
    fileName: string;
    contentType: string;
    expiresAt?: string;
  },
) {
  await getOwnedVehicleOrThrow(actor, vehicleId);
  // Una póliza o tarjeta de circulación llega legítimamente escaneada en PDF.
  const { extension, mime } = validateUpload(params.file, { allowPdf: true });
  const path = `vehicle-docs/${vehicleId}/${params.documentType}-${Date.now()}.${extension}`;
  await uploadPrivate(path, params.file, mime);

  const [created] = await db
    .insert(vehicleDocuments)
    .values({
      vehicleId,
      documentType: params.documentType,
      filePath: path,
      expiresAt: params.expiresAt,
      status: "pending",
    })
    .returning();
  return created;
}

// Fuente de verdad de qué documentos exige una publicación activa. `queries.ts` la importa para
// que el badge "documentos al día" de la ficha pública nunca prometa algo distinto de lo que esta
// función exige para activar.
export const REQUIRED_DOCUMENT_TYPES = [
  "tarjeta_circulacion",
  "poliza_seguro",
] as const;

export type ActivationBlockReason =
  | "identity_not_approved"
  | "documents_missing_or_not_approved"
  | "payouts_not_enabled"
  | "photos_missing";

// Un vehículo sin fotos no se puede vender, y con una sola no genera confianza suficiente para
// que un desconocido mueva dinero. Decisión del dueño del producto el 2026-08-02.
export const MIN_PHOTOS_TO_ACTIVATE = 3;

// La condición de Stripe Connect (payouts_enabled) se agrega en el paso 10 (E2-T5) como una
// condición más de esta misma función — sin reescribirla, sin romper este test (blueprint.md §9).
export async function activateVehicleCore(
  actor: Actor,
  vehicleId: string,
): Promise<{ ok: true } | { ok: false; reason: ActivationBlockReason }> {
  const vehicle = await getOwnedVehicleOrThrow(actor, vehicleId);

  const [identity] = await db
    .select()
    .from(identityVerifications)
    .where(
      and(
        eq(identityVerifications.userId, actor.id),
        eq(identityVerifications.status, "approved"),
      ),
    )
    .limit(1);
  if (!identity) {
    return { ok: false, reason: "identity_not_approved" };
  }

  const photos = await db
    .select({ id: vehiclePhotos.id })
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId));
  if (photos.length < MIN_PHOTOS_TO_ACTIVATE) {
    return { ok: false, reason: "photos_missing" };
  }

  const documents = await db
    .select()
    .from(vehicleDocuments)
    .where(eq(vehicleDocuments.vehicleId, vehicleId));
  const hasAllApproved = REQUIRED_DOCUMENT_TYPES.every((type) =>
    documents.some((d) => d.documentType === type && d.status === "approved"),
  );
  if (!hasAllApproved) {
    return { ok: false, reason: "documents_missing_or_not_approved" };
  }

  // Condición agregada en el paso 10 (E2-T5), sobre la misma función — sin reescribirla
  // (blueprint.md §9, comentario original de esta función).
  const [connected] = await db
    .select()
    .from(connectedAccounts)
    .where(
      and(
        eq(connectedAccounts.ownerId, actor.id),
        eq(connectedAccounts.payoutsEnabled, true),
      ),
    )
    .limit(1);
  if (!connected) {
    return { ok: false, reason: "payouts_not_enabled" };
  }

  await db
    .update(vehicles)
    .set({ status: "active" })
    .where(eq(vehicles.id, vehicle.id));
  return { ok: true };
}

// Bloquea un rango de días del calendario del vehículo. Escribe los límites con `utcDayBounds`
// porque es la misma convención que `computeSlots` usa para decidir si una excepción tapa un día
// (ver el comentario de esa función) — con cualquier otra, el bloqueo se corre a los días vecinos.
export async function blockVehicleDatesCore(
  actor: Actor,
  vehicleId: string,
  params: { from: string; to: string; reason?: string },
) {
  // Segunda capa de autorización dentro del service, no solo en el wrapper (regla 7 de CLAUDE.md).
  await getOwnedVehicleOrThrow(actor, vehicleId);

  const { startsAt } = utcDayBounds(params.from);
  const { endsAt } = utcDayBounds(params.to);
  if (endsAt <= startsAt) {
    throw new ConflictError("El rango de fechas está invertido.");
  }

  const [created] = await db
    .insert(availabilityExceptions)
    .values({
      vehicleId,
      startsAt,
      endsAt,
      type: "block",
      reason: params.reason,
    })
    .returning();
  return created;
}

export async function unblockVehicleDatesCore(
  actor: Actor,
  vehicleId: string,
  exceptionId: string,
) {
  await getOwnedVehicleOrThrow(actor, vehicleId);

  const [deleted] = await db
    .delete(availabilityExceptions)
    .where(
      and(
        eq(availabilityExceptions.id, exceptionId),
        // Acotado al vehículo ya verificado como propio: sin esto, un id de excepción de otro
        // dueño se borraría con solo poseer cualquier vehículo.
        eq(availabilityExceptions.vehicleId, vehicleId),
      ),
    )
    .returning();
  if (!deleted) {
    throw new NotFoundError("Bloqueo no encontrado.");
  }
  return deleted;
}

export async function reviewVehicleDocumentCore(
  actor: Actor & { isAdmin: boolean },
  params: { documentId: string; decision: "approved" | "rejected" },
) {
  if (!actor.isAdmin) {
    throw new ForbiddenError(
      "Solo un admin puede revisar documentos de vehículo.",
    );
  }
  const [updated] = await db
    .update(vehicleDocuments)
    .set({
      status: params.decision,
      reviewedBy: actor.id,
      reviewedAt: new Date(),
    })
    .where(
      and(
        eq(vehicleDocuments.id, params.documentId),
        eq(vehicleDocuments.status, "pending"),
      ),
    )
    .returning();
  return updated ?? null;
}
