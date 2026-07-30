type EventWithRequest = {
  request?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
  };
};

// Redacción de PII compartida entre cliente/servidor/edge — nunca el cuerpo de un documento, un
// número de tarjeta, ni contenido de sesión (blueprint.md §16, "Logging hygiene"). Tipado
// estructuralmente en vez de importar los tipos internos de Sentry: `Sentry.init({ beforeSend })`
// acepta cualquier función cuyo primer parámetro sea un supertipo compatible.
export function redactPii<T extends EventWithRequest>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
  }
  return event;
}
