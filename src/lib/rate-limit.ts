import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimitEvents } from "@/lib/db/schema";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

// Ventana fija respaldada en Postgres (tabla `rate_limit_events`) — un solo INSERT ... ON
// CONFLICT ... DO UPDATE atómico por bucket de tiempo, sin depender de Redis/Upstash a la escala
// de un piloto de 20 usuarios (blueprint.md §14, §20.3 decisión #3). `key` ya codifica a qué se
// limita (p. ej. `login:<ip>`, `mensajes:<userId>`) — esta función no sabe ni le importa qué
// representa.
export async function checkAndIncrement(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const [row] = await db
    .insert(rateLimitEvents)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitEvents.key, rateLimitEvents.windowStart],
      set: { count: sql`${rateLimitEvents.count} + 1` },
    })
    .returning();

  if (row.count > limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStart.getTime() + windowMs - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true };
}
