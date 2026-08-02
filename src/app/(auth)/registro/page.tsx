import { MailCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithGoogleAction,
  signUpWithPasswordAction,
} from "@/server/auth/actions";

const ERROR_MESSAGES: Record<string, string> = {
  datos_invalidos:
    "Revisa tu nombre, correo y contraseña (mínimo 6 caracteres).",
  no_se_pudo_registrar:
    "No se pudo crear la cuenta. ¿Ya existe una con ese correo?",
};

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; revisa_tu_correo?: string }>;
}) {
  const { error, revisa_tu_correo } = await searchParams;

  if (revisa_tu_correo) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <MailCheck className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Revisa tu correo
        </h1>
        <p className="text-muted-foreground">
          Te enviamos un link de confirmación. Ábrelo para activar tu cuenta.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <Card className="p-2">
        <CardHeader>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {ERROR_MESSAGES[error] ?? "Ocurrió un error, intenta de nuevo."}
            </p>
          )}

          <form
            action={signUpWithPasswordAction}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input id="fullName" type="text" name="fullName" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" name="email" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                name="password"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="mt-2 h-10">
              Crear cuenta
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />o
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={signInWithGoogleAction}>
            <Button type="submit" variant="outline" className="h-10 w-full">
              Continuar con Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/iniciar-sesion"
              className="text-primary hover:underline"
            >
              Inicia sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
