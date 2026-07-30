"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/server/auth/guards";
import {
  reviewVerificationCore,
  submitVerificationCore,
} from "@/server/identity/service";

const documentTypeSchema = z.enum(["cedula", "licencia"]);

export async function submitVerification(formData: FormData) {
  const actor = await requireUser();

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
    if (err instanceof Error && err.message === "FILE_TOO_LARGE") {
      redirect("/verificacion?error=archivo_muy_grande");
    }
    throw err;
  }

  redirect("/verificacion?enviado=1");
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
