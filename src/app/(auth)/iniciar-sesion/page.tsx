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
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold text-foreground">Iniciar sesión</h1>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error] ?? "Ocurrió un error, intenta de nuevo."}
        </p>
      )}

      <form action={signInWithPasswordAction} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          Correo
          <input
            type="email"
            name="email"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            type="password"
            name="password"
            required
            minLength={6}
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Iniciar sesión
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="w-full rounded-xl border border-input px-4 py-2 text-sm font-medium"
        >
          Continuar con Google
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <a href="/registro" className="text-primary">
          Regístrate
        </a>
      </p>
    </div>
  );
}
