import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import { identityVerifications } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";
import { submitVerification } from "@/server/identity/mutations";

const ERROR_MESSAGES: Record<string, string> = {
  archivo_requerido: "Sube una foto de tu documento.",
  archivo_vacio: "El archivo está vacío.",
  archivo_muy_grande: "El archivo supera los 10 MB.",
  tipo_no_permitido:
    "Solo se aceptan imágenes JPG, PNG, WEBP o un PDF. Revisamos el contenido real del archivo, no su nombre.",
  demasiados_intentos: "Demasiados envíos seguidos. Espera unos minutos.",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
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
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <span>Estado actual:</span>
          <Badge variant={STATUS_VARIANT[latest.status]}>{latest.status}</Badge>
          {latest.status === "rejected" && latest.rejectionReason
            ? ` — ${latest.rejectionReason}`
            : null}
        </div>
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

      <form action={submitVerification} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Tipo de documento</Label>
          <Select name="documentType" required defaultValue="cedula">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cedula">Cédula</SelectItem>
              <SelectItem value="licencia">Licencia de conducir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Foto del documento</Label>
          <Input id="file" type="file" name="file" accept="image/*" required />
        </div>
        <Button type="submit" className="mt-2 h-10">
          Enviar para revisión
        </Button>
      </form>
    </div>
  );
}
