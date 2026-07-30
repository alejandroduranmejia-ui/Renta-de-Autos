"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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
});

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
    description: formData.get("description") || undefined,
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
    make: formData.get("make") || undefined,
    model: formData.get("model") || undefined,
    year: formData.get("year") || undefined,
    plate: formData.get("plate") || undefined,
    color: formData.get("color") || undefined,
    seats: formData.get("seats") || undefined,
    dailyPriceCents: formData.get("dailyPriceCents") || undefined,
    description: formData.get("description") || undefined,
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
