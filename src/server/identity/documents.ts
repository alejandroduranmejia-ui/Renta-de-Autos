import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { getSignedUrl } from "@/lib/storage";

// Única puerta para mirar un documento del bucket privado.
//
// Hasta la auditoría del 2026-08-08 no existía ninguna: `/admin/verificaciones` consultaba
// `filePath` pero nunca lo mostraba, y `getSignedUrl()` era código muerto. El administrador
// aprobaba y rechazaba cédulas **a ciegas**, mientras la ficha pública prometía a cada
// arrendatario que "un administrador revisó la cédula del dueño".
//
// Reglas que esta función impone y que no deben relajarse:
//
// 1. **Solo admin.** El actor llega ya resuelto por `requireAdmin()`, y aquí se vuelve a
//    comprobar — segunda capa, igual que el resto de `service.ts` (CLAUDE.md, regla 7).
// 2. **60 segundos de vida.** Es el techo que fija blueprint.md §14 para una URL firmada. Basta
//    para abrirla y revisarla; no basta para reenviarla por WhatsApp y que siga sirviendo.
// 3. **Queda registrado.** Ver un documento de identidad es un acceso a dato sensible, así que se
//    escribe en `audit_log` igual que la decisión de aprobarlo o rechazarlo.

export class ForbiddenError extends Error {}

const SIGNED_URL_TTL_SECONDS = 60;

export async function getDocumentPreviewUrlCore(
  actor: { id: string; isAdmin: boolean },
  params: { filePath: string; targetType: string; targetId: string },
) {
  if (!actor.isAdmin) {
    throw new ForbiddenError("Solo un admin puede ver documentos.");
  }

  const url = await getSignedUrl(params.filePath, SIGNED_URL_TTL_SECONDS);

  await db.insert(auditLog).values({
    actorId: actor.id,
    action: "document.viewed",
    targetType: params.targetType,
    targetId: params.targetId,
    // Nunca la URL firmada: el log lo leen humanos y quedaría un enlace vivo escrito en claro.
    metadata: { filePath: params.filePath },
  });

  return url;
}
