import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identityVerifications, users } from "@/lib/db/schema";
import { reviewVerification } from "@/server/identity/mutations";

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
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <div>
                <p className="font-medium">{v.userName}</p>
                <p className="text-sm text-muted-foreground">
                  {v.userEmail} — {v.documentType}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={reviewVerification}>
                  <input type="hidden" name="verificationId" value={v.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button
                    type="submit"
                    className="rounded-lg bg-success px-3 py-1.5 text-sm font-medium text-success-foreground"
                  >
                    Aprobar
                  </button>
                </form>
                <form action={reviewVerification}>
                  <input type="hidden" name="verificationId" value={v.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <input
                    type="hidden"
                    name="rejectionReason"
                    value="Documento ilegible o inválido"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-white"
                  >
                    Rechazar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
