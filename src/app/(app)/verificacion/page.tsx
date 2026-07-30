import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { identityVerifications } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";
import { submitVerification } from "@/server/identity/mutations";

const ERROR_MESSAGES: Record<string, string> = {
  archivo_requerido: "Sube una foto de tu documento.",
  archivo_muy_grande: "El archivo no puede pesar más de 10MB.",
};

export default async function VerificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; enviado?: string }>;
}) {
  const actor = await requireUser();
  const { error, enviado } = await searchParams;

  const [latest] = await db
    .select()
    .from(identityVerifications)
    .where(eq(identityVerifications.userId, actor.id))
    .orderBy(identityVerifications.createdAt)
    .limit(1);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">
        Verificación de identidad
      </h1>

      {latest && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Estado actual: <strong>{latest.status}</strong>
          {latest.status === "rejected" && latest.rejectionReason
            ? ` — ${latest.rejectionReason}`
            : null}
        </p>
      )}

      {enviado && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Documento enviado. Un admin lo revisará pronto.
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error] ?? "Ocurrió un error, intenta de nuevo."}
        </p>
      )}

      <form action={submitVerification} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Tipo de documento
          <select
            name="documentType"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          >
            <option value="cedula">Cédula</option>
            <option value="licencia">Licencia de conducir</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Foto del documento
          <input type="file" name="file" accept="image/*" required />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Enviar para revisión
        </button>
      </form>
    </div>
  );
}
