import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { releaseExpiredHoldsCore } from "@/server/bookings/service";

// Vercel Cron firma sus invocaciones con `Authorization: Bearer ${CRON_SECRET}` — mismo
// mecanismo que este endpoint exige (blueprint.md §5). Secreto incorrecto o ausente → 401, sin
// tocar ninguna reserva.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const released = await releaseExpiredHoldsCore();
  return NextResponse.json({ released: released.length });
}
