import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  connectedAccounts,
  identityVerifications,
  vehicleDocuments,
  vehiclePhotos,
  vehicles,
} from "@/lib/db/schema";
import { uploadPrivate, uploadPublicPhoto } from "@/lib/storage";
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
  const extension = params.fileName.split(".").pop() ?? "jpg";
  const path = `${vehicleId}/${Date.now()}.${extension}`;
  await uploadPublicPhoto(
    path,
    params.file,
    params.contentType || "image/jpeg",
  );

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
  const extension = params.fileName.split(".").pop() ?? "jpg";
  const path = `vehicle-docs/${vehicleId}/${params.documentType}-${Date.now()}.${extension}`;
  await uploadPrivate(
    path,
    params.file,
    params.contentType || "application/octet-stream",
  );

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
  | "payouts_not_enabled";

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
