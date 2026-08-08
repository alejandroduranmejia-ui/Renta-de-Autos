import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, identityVerifications } from "@/lib/db/schema";
import { uploadPrivate } from "@/lib/storage";
import { validateUpload } from "@/lib/upload-validation";

// Capa de servicio — sin awareness de HTTP/Next.js (nunca importa cookies()/headers()), toma un
// actor ya resuelto y datos tipados. Esto es lo que hace testeable la lógica real sin un request
// context de Next.js, que los tests de Vitest no tienen (blueprint.md, api-design.md "Service layer
// first"). El wrapper "use server" en mutations.ts resuelve el actor vía requireUser()/
// requireAdmin() y delega aquí.

export class ForbiddenError extends Error {}

export async function submitVerificationCore(
  actor: { id: string },
  params: {
    documentType: "cedula" | "licencia";
    file: Buffer;
    fileName: string;
    contentType: string;
  },
) {
  // La extensión y el tipo salen del CONTENIDO real del archivo, no del nombre ni del
  // `Content-Type` que manda el cliente — ambos eran manipulables (auditoría del 2026-08-08).
  const { extension, mime } = validateUpload(params.file, { allowPdf: true });
  const path = `identity/${actor.id}/${Date.now()}.${extension}`;
  await uploadPrivate(path, params.file, mime);

  const [created] = await db
    .insert(identityVerifications)
    .values({
      userId: actor.id,
      documentType: params.documentType,
      filePath: path,
      status: "pending",
    })
    .returning();

  return created;
}

export async function reviewVerificationCore(
  actor: { id: string; isAdmin: boolean },
  params: {
    verificationId: string;
    decision: "approved" | "rejected";
    rejectionReason?: string;
  },
) {
  // Segunda capa de defensa — el guard de la Server Action ya revisó esto, pero la capa de
  // servicio nunca confía en que fue la única verificación (blueprint.md §8).
  if (!actor.isAdmin) {
    throw new ForbiddenError("Solo un admin puede revisar verificaciones.");
  }

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(identityVerifications)
      .set({
        status: params.decision,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        rejectionReason:
          params.decision === "rejected" ? params.rejectionReason : null,
      })
      .where(
        and(
          eq(identityVerifications.id, params.verificationId),
          eq(identityVerifications.status, "pending"),
        ),
      )
      .returning();

    if (!updated) return null;

    await tx.insert(auditLog).values({
      actorId: actor.id,
      action: `identity.${params.decision}`,
      targetType: "identity_verification",
      targetId: updated.id,
      metadata: { userId: updated.userId },
    });

    return updated;
  });
}
