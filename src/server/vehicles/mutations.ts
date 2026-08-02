"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { FEATURE_KEYS } from "@/lib/vehicle-features";
import {
  FUEL_TYPE_KEYS,
  TRANSMISSION_KEYS,
  VEHICLE_TYPE_KEYS,
} from "@/lib/vehicle-taxonomy";
import { requireAdmin, requireUser } from "@/server/auth/guards";
import {
  activateVehicleCore,
  addVehicleDocumentCore,
  addVehiclePhotoCore,
  blockVehicleDatesCore,
  createVehicleCore,
  deactivateVehicleCore,
  reviewVehicleDocumentCore,
  unblockVehicleDatesCore,
  updateVehicleCore,
} from "@/server/vehicles/service";

const createSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1),
  plate: z.string().min(1),
  color: z.string().min(1),
  seats: z.coerce.number().int().min(1).max(20),
  dailyPriceCents: z.coerce.number().int().min(1),
  description: z.string().optional(),
  // Campos de descubrimiento — opcionales, y sus valores permitidos son exactamente los de los
  // `check` constraints de la tabla (src/lib/vehicle-taxonomy.ts es la fuente compartida).
  zone: z.string().min(1).optional(),
  pickupNotes: z.string().optional(),
  vehicleType: z.enum(VEHICLE_TYPE_KEYS).optional(),
  transmission: z.enum(TRANSMISSION_KEYS).optional(),
  fuelType: z.enum(FUEL_TYPE_KEYS).optional(),
  // Lista blanca cerrada: nada fuera de src/lib/vehicle-features.ts llega a la columna `features`.
  features: z.array(z.enum(FEATURE_KEYS)).optional(),
});

/** Los `<select>` vacíos mandan "" y Zod los rechazaría — se normalizan a undefined. */
function optional(formData: FormData, key: string) {
  return (formData.get(key) as string | null) || undefined;
}

export async function createVehicle(formData: FormData) {
  const actor = await requireUser();
  const parsed = createSchema.parse({
    make: formData.get("make"),
    model: formData.get("model"),
    year: formData.get("year"),
    plate: formData.get("plate"),
    color: formData.get("color"),
    seats: formData.get("seats"),
    dailyPriceCents: formData.get("dailyPriceCents"),
    description: optional(formData, "description"),
    zone: optional(formData, "zone"),
    pickupNotes: optional(formData, "pickupNotes"),
    vehicleType: optional(formData, "vehicleType"),
    transmission: optional(formData, "transmission"),
    fuelType: optional(formData, "fuelType"),
    // Los checkboxes marcados llegan repetidos bajo la misma clave.
    features: formData.getAll("features").length
      ? (formData.getAll("features") as string[])
      : undefined,
  });

  const created = await createVehicleCore(actor, parsed);
  redirect(`/mis-vehiculos/${created.id}/editar`);
}

export async function deactivateVehicle(formData: FormData) {
  const actor = await requireUser();
  const vehicleId = z.string().uuid().parse(formData.get("vehicleId"));
  await deactivateVehicleCore(actor, vehicleId);
}

export async function activateVehicle(formData: FormData) {
  const actor = await requireUser();
  const vehicleId = z.string().uuid().parse(formData.get("vehicleId"));
  const result = await activateVehicleCore(actor, vehicleId);
  if (!result.ok) {
    redirect(`/mis-vehiculos/${vehicleId}/editar?error=${result.reason}`);
  }
}

export async function addVehiclePhoto(formData: FormData) {
  const actor = await requireUser();
  const vehicleId = z.string().uuid().parse(formData.get("vehicleId"));
  // El input es `multiple`: activar exige MIN_PHOTOS_TO_ACTIVATE fotos y subirlas de a una era
  // fricción pura.
  const files = formData
    .getAll("file")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    redirect(`/mis-vehiculos/${vehicleId}/editar?error=archivo_requerido`);
  }
  // En serie: `addVehiclePhotoCore` calcula `position` contando las fotos existentes, así que en
  // paralelo dos subidas se asignarían la misma posición.
  for (const file of files) {
    await addVehiclePhotoCore(actor, vehicleId, {
      file: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      contentType: file.type,
    });
  }
  redirect(`/mis-vehiculos/${vehicleId}/editar`);
}

const documentTypeSchema = z.enum(["tarjeta_circulacion", "poliza_seguro"]);

export async function addVehicleDocument(formData: FormData) {
  const actor = await requireUser();
  const vehicleId = z.string().uuid().parse(formData.get("vehicleId"));
  const documentType = documentTypeSchema.parse(formData.get("documentType"));
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    redirect(`/mis-vehiculos/${vehicleId}/editar?error=archivo_requerido`);
  }
  await addVehicleDocumentCore(actor, vehicleId, {
    documentType,
    file: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    contentType: file.type,
    expiresAt: (formData.get("expiresAt") as string) || undefined,
  });
  redirect(`/mis-vehiculos/${vehicleId}/editar`);
}

export async function updateVehicle(formData: FormData) {
  const actor = await requireUser();
  const vehicleId = z.string().uuid().parse(formData.get("vehicleId"));
  const parsed = createSchema.partial().parse({
    make: optional(formData, "make"),
    model: optional(formData, "model"),
    year: optional(formData, "year"),
    plate: optional(formData, "plate"),
    color: optional(formData, "color"),
    seats: optional(formData, "seats"),
    dailyPriceCents: optional(formData, "dailyPriceCents"),
    description: optional(formData, "description"),
    zone: optional(formData, "zone"),
    pickupNotes: optional(formData, "pickupNotes"),
    vehicleType: optional(formData, "vehicleType"),
    transmission: optional(formData, "transmission"),
    fuelType: optional(formData, "fuelType"),
    // Los checkboxes marcados llegan repetidos bajo la misma clave.
    features: formData.getAll("features").length
      ? (formData.getAll("features") as string[])
      : undefined,
  });
  await updateVehicleCore(actor, vehicleId, parsed);
  redirect(`/mis-vehiculos/${vehicleId}/editar?guardado=1`);
}

const blockDatesSchema = z.object({
  vehicleId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

export async function blockVehicleDates(formData: FormData) {
  const actor = await requireUser();
  const parsed = blockDatesSchema.parse({
    vehicleId: formData.get("vehicleId"),
    from: formData.get("from"),
    to: formData.get("to"),
    reason: optional(formData, "reason"),
  });
  await blockVehicleDatesCore(actor, parsed.vehicleId, parsed);
  redirect(`/mis-vehiculos/${parsed.vehicleId}/disponibilidad?guardado=1`);
}

export async function unblockVehicleDates(formData: FormData) {
  const actor = await requireUser();
  const vehicleId = z.string().uuid().parse(formData.get("vehicleId"));
  const exceptionId = z.string().uuid().parse(formData.get("exceptionId"));
  await unblockVehicleDatesCore(actor, vehicleId, exceptionId);
  revalidatePath(`/mis-vehiculos/${vehicleId}/disponibilidad`);
}

const reviewDocumentSchema = z.object({
  documentId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export async function reviewVehicleDocument(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = reviewDocumentSchema.parse({
    documentId: formData.get("documentId"),
    decision: formData.get("decision"),
  });
  await reviewVehicleDocumentCore(admin, parsed);
  revalidatePath("/admin/vehiculos");
}
