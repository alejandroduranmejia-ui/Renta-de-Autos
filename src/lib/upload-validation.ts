// Validación única para todo archivo que entra al sistema — identidad, documentos del vehículo y
// fotos. Antes cada ruta de subida confiaba en dos cosas que el cliente controla por completo: el
// `Content-Type` que declara y la extensión del nombre del archivo (auditoría del 2026-08-08).
//
// Qué resolvía mal cada una:
//
// - **Tipo declarado por el cliente.** Se podía subir un `.html` diciendo que era `image/jpeg`. En
//   el bucket de fotos, que es PÚBLICO, eso permite servir HTML desde el dominio de Supabase.
// - **Extensión del nombre.** Salía de `fileName.split(".").pop()` y se pegaba directo a la ruta:
//   un nombre como `x.jpg/../../otro` escribía fuera de la carpeta del usuario.
// - **Sin tamaño máximo** en fotos ni documentos de vehículo (identidad sí lo tenía).

export class UploadValidationError extends Error {
  constructor(readonly code: UploadErrorCode) {
    super(code);
  }
}

export type UploadErrorCode =
  | "archivo_vacio"
  | "archivo_muy_grande"
  | "tipo_no_permitido";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type Allowed = { extension: string; mime: string };

// La extensión NUNCA sale del nombre que manda el cliente: se deriva del contenido real.
const IMAGE_TYPES: Allowed[] = [
  { extension: "jpg", mime: "image/jpeg" },
  { extension: "png", mime: "image/png" },
  { extension: "webp", mime: "image/webp" },
];

const PDF_TYPE: Allowed = { extension: "pdf", mime: "application/pdf" };

/** Lee los primeros bytes del archivo para saber qué es de verdad. Un archivo puede llamarse
 *  `foto.jpg` y declararse `image/jpeg` y aun así ser HTML; la firma binaria no se puede fingir
 *  sin construir un archivo que también sea una imagen válida. */
function sniff(file: Buffer): Allowed | null {
  if (file.length < 12) return null;

  // JPEG: FF D8 FF
  if (file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff) {
    return IMAGE_TYPES[0];
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    file[0] === 0x89 &&
    file[1] === 0x50 &&
    file[2] === 0x4e &&
    file[3] === 0x47 &&
    file[4] === 0x0d &&
    file[5] === 0x0a &&
    file[6] === 0x1a &&
    file[7] === 0x0a
  ) {
    return IMAGE_TYPES[1];
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    file.toString("ascii", 0, 4) === "RIFF" &&
    file.toString("ascii", 8, 12) === "WEBP"
  ) {
    return IMAGE_TYPES[2];
  }
  // PDF: "%PDF-"
  if (file.toString("ascii", 0, 5) === "%PDF-") {
    return PDF_TYPE;
  }
  return null;
}

/** Valida y devuelve la extensión y el tipo MIME REALES, derivados del contenido. El llamador debe
 *  usar estos valores para construir la ruta y el `contentType`, nunca los del cliente.
 *
 *  `allowPdf` es para documentos (cédula, tarjeta de circulación, póliza), que legítimamente
 *  llegan escaneados en PDF. Las fotos de vehículo solo aceptan imagen. */
export function validateUpload(
  file: Buffer,
  { allowPdf = false }: { allowPdf?: boolean } = {},
): Allowed {
  if (file.byteLength === 0) {
    throw new UploadValidationError("archivo_vacio");
  }
  if (file.byteLength > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("archivo_muy_grande");
  }

  const detected = sniff(file);
  if (!detected) {
    throw new UploadValidationError("tipo_no_permitido");
  }
  if (detected.mime === PDF_TYPE.mime && !allowPdf) {
    throw new UploadValidationError("tipo_no_permitido");
  }
  return detected;
}
