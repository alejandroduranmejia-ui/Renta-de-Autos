"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/server/auth/guards";
import {
  ConflictError,
  cancelBookingCore,
  createBookingCore,
} from "@/server/bookings/service";

const createSchema = z.object({
  vehicleId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export async function createBooking(formData: FormData) {
  const actor = await requireUser();
  const parsed = createSchema.parse({
    vehicleId: formData.get("vehicleId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });

  try {
    const created = await createBookingCore(actor, parsed);
    redirect(`/mis-reservas?creada=${created.id}`);
  } catch (err) {
    if (err instanceof ConflictError) {
      redirect(`/vehiculos/${parsed.vehicleId}?error=fechas_no_disponibles`);
    }
    throw err;
  }
}

export async function cancelBooking(formData: FormData) {
  const actor = await requireUser();
  const bookingId = z.string().uuid().parse(formData.get("bookingId"));
  await cancelBookingCore(actor, bookingId);
}
