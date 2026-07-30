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
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-24 text-center">
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
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-2xl font-semibold text-foreground">Crear cuenta</h1>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[error] ?? "Ocurrió un error, intenta de nuevo."}
        </p>
      )}

      <form action={signUpWithPasswordAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Nombre completo
          <input
            type="text"
            name="fullName"
            required
            className="rounded-lg border border-input bg-transparent px-3 py-2"
          />
        </label>
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
          Crear cuenta
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        o
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogleAction}>
        <button
          type="submit"
          className="w-full rounded-xl border border-input px-4 py-2 text-sm font-medium"
        >
          Continuar con Google
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <a href="/iniciar-sesion" className="text-primary">
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
