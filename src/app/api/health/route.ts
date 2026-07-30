import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// `?fail=1` dispara un error deliberado para verificar que Sentry recibe la excepción con un
// `request_id` correlacionable — tanto en el evento reportado como en el log de servidor y en la
// respuesta, para que quien dispara la prueba pueda encontrar su propio evento sin acceso a los
// logs (blueprint.md §9, paso 15, "done when #1").
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("fail") === "1") {
    const requestId = randomUUID();
    const error = new Error(
      "Fallo deliberado para verificar el reporte a Sentry (/api/health?fail=1).",
    );
    Sentry.captureException(error, { tags: { request_id: requestId } });
    console.error(
      JSON.stringify({ request_id: requestId, message: error.message }),
    );
    return NextResponse.json(
      { error: "deliberate_test_error", request_id: requestId },
      { status: 500 },
    );
  }

  try {
    const [latest] = await db.execute<{ id: number; hash: string }>(
      sql`select id, hash from drizzle.__drizzle_migrations order by id desc limit 1`,
    );
    return NextResponse.json({
      status: "ok",
      migration: latest ? { id: latest.id, hash: latest.hash } : null,
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
