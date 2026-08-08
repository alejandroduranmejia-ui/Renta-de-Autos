"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkAndIncrement } from "@/lib/rate-limit";
import { requireUser } from "@/server/auth/guards";
import {
  ConflictError,
  cancelBookingCore,
  createBookingCore,
} from "@/server/bookings/service";
import { TooManyRequestsError } from "@/server/errors";

const createSchema = z.object({
  vehicleId: z.string().uuid(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export async function createBooking(formData: FormData) {
  const actor = await requireUser();

  // Cada reserva creada retiene el vehículo 15 minutos vía el exclusion constraint. Sin límite,
  // un usuario podía encadenar reservas y dejar un vehículo permanentemente no disponible sin
  // pagar nada — denegación de servicio contra el dueño (auditoría del 2026-08-08).
  const limit = await checkAndIncrement(`reservas:${actor.id}`, 10, 300);
  if (!limit.allowed) {
    throw new TooManyRequestsError(
      "Has creado demasiadas reservas seguidas. Espera unos minutos.",
    );
  }
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
