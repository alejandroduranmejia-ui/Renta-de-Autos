import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

// Ruta temporal de diagnóstico — se borra en cuanto se confirme qué valores llegaron a producción.
function fingerprint(value: string | undefined) {
  if (!value) return null;
  return {
    length: value.length,
    sha256_12: createHash("sha256").update(value).digest("hex").slice(0, 12),
  };
}

export async function GET() {
  return NextResponse.json({
    STRIPE_WEBHOOK_SECRET: fingerprint(process.env.STRIPE_WEBHOOK_SECRET),
    STRIPE_CONNECT_WEBHOOK_SECRET: fingerprint(
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    ),
  });
}
