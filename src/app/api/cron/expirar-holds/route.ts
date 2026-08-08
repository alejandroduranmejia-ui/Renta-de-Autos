import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { releaseExpiredHoldsCore } from "@/server/bookings/service";

// Vercel Cron firma sus invocaciones con `Authorization: Bearer ${CRON_SECRET}` — mismo
// mecanismo que este endpoint exige (blueprint.md §5). Secreto incorrecto o ausente → 401, sin
// tocar ninguna reserva.
// Comparación de tiempo constante: `!==` corta en el primer byte distinto, lo que en teoría deja
// medir el secreto byte a byte. Explotarlo sobre HTTP es poco realista, pero el reemplazo es
// gratis (auditoría del 2026-08-08).
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual exige longitudes iguales; compararlas antes reintroduce una fuga mínima
  // (la longitud), que no es el secreto.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth || !safeEqual(auth, `Bearer ${env.CRON_SECRET}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredHoldsCore();
  return NextResponse.json({ released: released.length });
}
