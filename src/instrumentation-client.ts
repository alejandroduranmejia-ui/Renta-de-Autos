import * as Sentry from "@sentry/nextjs";
import { redactPii } from "@/sentry-redact";

// Reemplaza a `sentry.client.config.ts` — ese archivo no funciona con Turbopack (el loader que
// usaba nunca se ejecutaba), `instrumentation-client.ts` es el mecanismo soportado. Sin
// `NEXT_PUBLIC_SENTRY_DSN` el SDK no reporta nada del lado del navegador (blueprint.md regla 11).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend: redactPii,
});
