import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";
import {
  MAX_UPLOAD_BYTES,
  UploadValidationError,
  validateUpload,
} from "@/lib/upload-validation";

// Regresiones de la auditoría del 2026-08-08. Cada caso corresponde a un hallazgo real, no a una
// hipótesis: el de `safeNextPath` se confirmó en producción devolviendo el valor externo dentro
// del formulario de login.

describe("safeNextPath — redirección abierta", () => {
  it("rechaza URLs absolutas a otro sitio", () => {
    expect(safeNextPath("https://sitio-falso.com")).toBe("/");
    expect(safeNextPath("http://sitio-falso.com")).toBe("/");
  });

  it("rechaza URLs protocolo-relativas, que saltan de host sin escribir el esquema", () => {
    expect(safeNextPath("//sitio-falso.com")).toBe("/");
    expect(safeNextPath("//sitio-falso.com/login")).toBe("/");
  });

  it("rechaza backslashes, que algunos navegadores normalizan a barras", () => {
    expect(safeNextPath("/\\sitio-falso.com")).toBe("/");
    expect(safeNextPath("\\\\sitio-falso.com")).toBe("/");
  });

  it("rechaza cualquier cosa que no sea una ruta", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(42)).toBe("/");
  });

  it("conserva las rutas internas legítimas, incluidos parámetros", () => {
    expect(safeNextPath("/mis-reservas")).toBe("/mis-reservas");
    expect(safeNextPath("/vehiculos?zone=Chapinero")).toBe(
      "/vehiculos?zone=Chapinero",
    );
  });
});

// Firmas mínimas reales de cada formato.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);
const PDF = Buffer.from("%PDF-1.7 resto del documento", "ascii");
const HTML = Buffer.from("<html><script>alert(1)</script></html>", "ascii");

describe("validateUpload — archivos subidos", () => {
  it("acepta imágenes reales y devuelve la extensión derivada del contenido", () => {
    expect(validateUpload(JPEG)).toEqual({
      extension: "jpg",
      mime: "image/jpeg",
    });
    expect(validateUpload(PNG)).toEqual({
      extension: "png",
      mime: "image/png",
    });
  });

  it("rechaza HTML aunque el cliente jure que es una imagen", () => {
    // Este es el ataque concreto: el bucket de fotos es público, así que un HTML servido desde el
    // dominio de Supabase ejecuta scripts con ese origen.
    expect(() => validateUpload(HTML)).toThrow(UploadValidationError);
  });

  it("acepta PDF solo donde se permite explícitamente", () => {
    expect(validateUpload(PDF, { allowPdf: true })).toEqual({
      extension: "pdf",
      mime: "application/pdf",
    });
    // Una foto de vehículo nunca es un PDF.
    expect(() => validateUpload(PDF)).toThrow(UploadValidationError);
  });

  it("rechaza archivos vacíos y los que superan el máximo", () => {
    expect(() => validateUpload(Buffer.alloc(0))).toThrow(
      UploadValidationError,
    );
    const tooBig = Buffer.concat([JPEG, Buffer.alloc(MAX_UPLOAD_BYTES)]);
    expect(() => validateUpload(tooBig)).toThrow(UploadValidationError);
  });

  it("expone el motivo como código estable, no como texto suelto", () => {
    try {
      validateUpload(HTML);
      expect.unreachable("debía lanzar");
    } catch (err) {
      expect(err).toBeInstanceOf(UploadValidationError);
      expect((err as UploadValidationError).code).toBe("tipo_no_permitido");
    }
  });
});
