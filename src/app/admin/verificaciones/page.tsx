import { eq } from "drizzle-orm";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { identityVerifications, users } from "@/lib/db/schema";
import { openDocument, reviewVerification } from "@/server/identity/mutations";

export default async function AdminVerificacionesPage() {
  const pending = await db
    .select({
      id: identityVerifications.id,
      documentType: identityVerifications.documentType,
      filePath: identityVerifications.filePath,
      userEmail: users.email,
      userName: users.fullName,
    })
    .from(identityVerifications)
    .innerJoin(users, eq(users.id, identityVerifications.userId))
    .where(eq(identityVerifications.status, "pending"));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">
        Verificaciones pendientes ({pending.length})
      </h1>

      {pending.length === 0 ? (
        <p className="text-muted-foreground">
          No hay nada pendiente de revisar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between surface px-4 py-3"
            >
              <div>
                <p className="font-medium text-card-foreground">{v.userName}</p>
                <p className="text-sm text-muted-foreground">
                  {v.userEmail} — {v.documentType}
                </p>
              </div>
              <div className="flex gap-2">
                {/* Sin esto el admin aprobaba sin ver nada. Abre en una pestaña nueva con una URL
                    firmada de 60 segundos, y el acceso queda en `audit_log`. */}
                <form action={openDocument} target="_blank" rel="noopener">
                  <input type="hidden" name="filePath" value={v.filePath} />
                  <input
                    type="hidden"
                    name="targetType"
                    value="identity_verification"
                  />
                  <input type="hidden" name="targetId" value={v.id} />
                  <Button type="submit" size="sm" variant="outline">
                    <Eye className="size-4" />
                    Ver documento
                  </Button>
                </form>
                <form action={reviewVerification}>
                  <input type="hidden" name="verificationId" value={v.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/80"
                  >
                    Aprobar
                  </Button>
                </form>
                <form action={reviewVerification}>
                  <input type="hidden" name="verificationId" value={v.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <input
                    type="hidden"
                    name="rejectionReason"
                    value="Documento ilegible o inválido"
                  />
                  <Button type="submit" size="sm" variant="destructive">
                    Rechazar
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
