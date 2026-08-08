import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { auditLog, identityVerifications, users } from "@/lib/db/schema";
import { UploadValidationError } from "@/lib/upload-validation";

// Firma real de un JPEG. Desde la auditoría del 2026-08-08 el contenido se inspecciona de verdad,
// así que un buffer de texto arbitrario ya no pasa por imagen.
const JPEG_FIXTURE = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

import {
  ForbiddenError,
  reviewVerificationCore,
  submitVerificationCore,
} from "@/server/identity/service";

// Prueba la capa de servicio directamente, con un actor ya resuelto — las Server Actions que la
// envuelven (mutations.ts) necesitan cookies()/headers() de un request real de Next.js, que
// Vitest no provee (blueprint.md, "Service layer first").
describe("identity verification", () => {
  const userId = "cccccccc-0000-0000-0000-000000000001";
  const adminId = "cccccccc-0000-0000-0000-000000000002";

  afterAll(async () => {
    await db
      .delete(auditLog)
      .where(eq(auditLog.targetType, "identity_verification"));
    await db
      .delete(identityVerifications)
      .where(eq(identityVerifications.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(users).where(eq(users.id, adminId));
  });

  it("uploads to the private bucket and creates a pending row", async () => {
    await db.insert(users).values({
      id: userId,
      email: `${userId}@test.local`,
      fullName: "Test User",
    });

    const created = await submitVerificationCore(
      { id: userId },
      {
        documentType: "cedula",
        file: JPEG_FIXTURE,
        fileName: "cedula.jpg",
        contentType: "image/jpeg",
      },
    );

    expect(created.status).toBe("pending");
    expect(created.filePath).toMatch(new RegExp(`^identity/${userId}/`));
    // La extensión sale del contenido, no del nombre del archivo.
    expect(created.filePath).toMatch(/\.jpg$/);
  });

  it("rechaza un archivo que no es realmente una imagen ni un PDF", async () => {
    // Antes de la auditoría del 2026-08-08 esto se aceptaba: bastaba con declarar
    // `contentType: "image/jpeg"` y llamarlo `.jpg`.
    await expect(
      submitVerificationCore(
        { id: userId },
        {
          documentType: "cedula",
          file: Buffer.from("<html><script>alert(1)</script></html>", "ascii"),
          fileName: "cedula.jpg",
          contentType: "image/jpeg",
        },
      ),
    ).rejects.toThrow(UploadValidationError);
  });

  it("rejects a non-admin trying to review, and writes nothing", async () => {
    await db.insert(users).values({
      id: adminId,
      email: `${adminId}@test.local`,
      fullName: "Not Admin",
      isAdmin: false,
    });

    const [pending] = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, userId))
      .limit(1);

    await expect(
      reviewVerificationCore(
        { id: adminId, isAdmin: false },
        { verificationId: pending.id, decision: "approved" },
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const [stillPending] = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.id, pending.id));
    expect(stillPending.status).toBe("pending");
    expect(stillPending.reviewedBy).toBeNull();
  });

  it("approves a verification and writes an audit_log row in the same transaction", async () => {
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, adminId));

    const [pending] = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.userId, userId))
      .limit(1);

    await reviewVerificationCore(
      { id: adminId, isAdmin: true },
      { verificationId: pending.id, decision: "approved" },
    );

    const [approved] = await db
      .select()
      .from(identityVerifications)
      .where(eq(identityVerifications.id, pending.id));
    expect(approved.status).toBe("approved");
    expect(approved.reviewedBy).toBe(adminId);

    const [audit] = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.targetId, pending.id));
    expect(audit.action).toBe("identity.approved");
  });
});
