import * as Sentry from "@sentry/nextjs";
import { redactPii } from "@/sentry-redact";

// `register()` corre una vez por runtime (nodejs y edge por separado) — sin `SENTRY_DSN` el SDK
// simplemente no reporta nada, nunca falla el arranque (blueprint.md regla 11).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      beforeSend: redactPii,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      beforeSend: redactPii,
    });
  }
}

// Captura cualquier error no manejado explícitamente por un Server Component/Route
// Handler/Server Action — capa de red de seguridad además del reporte explícito en
// `/api/health` (blueprint.md §9, paso 15).
export const onRequestError = Sentry.captureRequestError;
