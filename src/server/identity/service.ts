import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, identityVerifications } from "@/lib/db/schema";
import { uploadPrivate } from "@/lib/storage";

// Capa de servicio — sin awareness de HTTP/Next.js (nunca importa cookies()/headers()), toma un
// actor ya resuelto y datos tipados. Esto es lo que hace testeable la lógica real sin un request
// context de Next.js, que los tests de Vitest no tienen (blueprint.md, api-design.md "Service layer
// first"). El wrapper "use server" en mutations.ts resuelve el actor vía requireUser()/
// requireAdmin() y delega aquí.

export class ForbiddenError extends Error {}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function submitVerificationCore(
  actor: { id: string },
  params: {
    documentType: "cedula" | "licencia";
    file: Buffer;
    fileName: string;
    contentType: string;
  },
) {
  if (params.file.byteLength === 0) {
    throw new Error("FILE_EMPTY");
  }
  if (params.file.byteLength > MAX_FILE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const extension = params.fileName.split(".").pop() ?? "jpg";
  const path = `identity/${actor.id}/${Date.now()}.${extension}`;
  await uploadPrivate(
    path,
    params.file,
    params.contentType || "application/octet-stream",
  );

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
