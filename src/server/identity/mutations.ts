"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAndIncrement } from "@/lib/rate-limit";
import { UploadValidationError } from "@/lib/upload-validation";
import { requireAdmin, requireUser } from "@/server/auth/guards";
import { getDocumentPreviewUrlCore } from "@/server/identity/documents";
import {
  reviewVerificationCore,
  submitVerificationCore,
} from "@/server/identity/service";

const documentTypeSchema = z.enum(["cedula", "licencia"]);

export async function submitVerification(formData: FormData) {
  const actor = await requireUser();

  // Cada envío escribe un archivo en el bucket privado. 5 cada 10 minutos permite reintentar
  // cuando la primera foto salió movida, y corta el llenado del almacenamiento.
  const limit = await checkAndIncrement(`verificacion:${actor.id}`, 5, 600);
  if (!limit.allowed) {
    redirect("/verificacion?error=demasiados_intentos");
  }

  const documentType = documentTypeSchema.parse(formData.get("documentType"));
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    redirect("/verificacion?error=archivo_requerido");
  }

  try {
    await submitVerificationCore(actor, {
      documentType,
      file: Buffer.from(await file.arrayBuffer()),
      fileName: file.name,
      contentType: file.type,
    });
  } catch (err) {
    // El código del error ya es el identificador que la página traduce a un mensaje — no se
    // filtra ningún detalle interno al usuario.
    if (err instanceof UploadValidationError) {
      redirect(`/verificacion?error=${err.code}`);
    }
    throw err;
  }

  redirect("/verificacion?enviado=1");
}

const previewSchema = z.object({
  filePath: z.string().min(1),
  targetType: z.enum(["identity_verification", "vehicle_document"]),
  targetId: z.string().uuid(),
});

/** Genera la URL firmada y redirige a ella. El admin nunca ve la URL en el HTML de la página:
 *  solo existe durante los 60 segundos que dura la redirección y su pestaña. */
export async function openDocument(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = previewSchema.parse({
    filePath: formData.get("filePath"),
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
  });

  const url = await getDocumentPreviewUrlCore(admin, parsed);
  redirect(url);
}

const reviewSchema = z.object({
  verificationId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

export async function reviewVerification(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = reviewSchema.parse({
    verificationId: formData.get("verificationId"),
    decision: formData.get("decision"),
    rejectionReason: formData.get("rejectionReason") ?? undefined,
  });

  await reviewVerificationCore(admin, parsed);
  // Sin esto, el listado de /admin/verificaciones seguiría mostrando la fila como pendiente
  // hasta un refresh manual — Next.js no revalida rutas después de una Server Action por sí solo.
  revalidatePath("/admin/verificaciones");
}
