"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { bookings, messages, vehicles } from "@/lib/db/schema";
import { requireUser } from "@/server/auth/guards";
import { NotFoundError } from "@/server/errors";

const sendSchema = z.object({
  bookingId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

// Autoriza solo al renter o al owner de esa reserva — la política RLS de la migración 0003 es
// defensa en profundidad para un futuro insert directo del cliente, no lo único que protege esto
// (blueprint.md §9, paso 13).
export async function sendMessage(formData: FormData) {
  const actor = await requireUser();
  const parsed = sendSchema.parse({
    bookingId: formData.get("bookingId"),
    body: formData.get("body"),
  });

  const [row] = await db
    .select({ renterId: bookings.renterId, ownerId: vehicles.ownerId })
    .from(bookings)
    .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(eq(bookings.id, parsed.bookingId))
    .limit(1);
  if (!row || (row.renterId !== actor.id && row.ownerId !== actor.id)) {
    throw new NotFoundError("Reserva no encontrada.");
  }

  await db.insert(messages).values({
    bookingId: parsed.bookingId,
    senderId: actor.id,
    body: parsed.body,
  });
}
