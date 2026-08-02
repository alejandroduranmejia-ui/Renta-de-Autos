"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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
  createVehicleCore,
  deactivateVehicleCore,
  reviewVehicleDocumentCore,
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
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    redirect(`/mis-vehiculos/${vehicleId}/editar?error=archivo_requerido`);
  }
  await addVehiclePhotoCore(actor, vehicleId, {
    file: Buffer.from(await file.arrayBuffer()),
    fileName: file.name,
    contentType: file.type,
  });
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
  });
  await updateVehicleCore(actor, vehicleId, parsed);
  redirect(`/mis-vehiculos/${vehicleId}/editar?guardado=1`);
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
