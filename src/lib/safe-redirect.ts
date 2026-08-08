// Único lugar donde se decide si un destino de redirección es aceptable.
//
// El parámetro `next` viaja por el login, el registro, el flujo de Google y el callback de correo.
// Sin validar, `redirect(next)` de Next.js sigue URLs absolutas: bastaba un enlace a
// `/iniciar-sesion?next=https://sitio-falso.com` para que el usuario se autenticara de verdad en
// el dominio real —con su certificado válido— y terminara depositado en una copia del atacante
// (auditoría del 2026-08-08, confirmado en producción).
//
// Solo se acepta una ruta interna: empieza con "/" y NO con "//" ni "/\", que los navegadores
// interpretan como protocolo-relativas y saltan a otro host.
const DEFAULT_PATH = "/";

export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return DEFAULT_PATH;
  if (!value.startsWith("/")) return DEFAULT_PATH;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_PATH;
  // Un backslash en cualquier posición temprana también sirve para confundir al parser de URL de
  // algunos navegadores; se rechaza en vez de intentar normalizarlo.
  if (value.includes("\\")) return DEFAULT_PATH;
  return value;
}
