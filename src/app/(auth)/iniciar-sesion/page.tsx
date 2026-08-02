import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signInWithGoogleAction,
  signInWithPasswordAction,
} from "@/server/auth/actions";

const ERROR_MESSAGES: Record<string, string> = {
  datos_invalidos: "Revisa el correo y la contraseña.",
  credenciales_invalidas: "Correo o contraseña incorrectos.",
  google_no_disponible:
    "El inicio de sesión con Google no está disponible ahora mismo.",
  confirmacion_invalida: "El link de confirmación no es válido o ya expiró.",
};

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/", error } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-24">
      <Card className="p-2">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {ERROR_MESSAGES[error] ?? "Ocurrió un error, intenta de nuevo."}
            </p>
          )}

          <form
            action={signInWithPasswordAction}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="next" value={next} />
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
              Iniciar sesión
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />o
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={signInWithGoogleAction}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="outline" className="h-10 w-full">
              Continuar con Google
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
