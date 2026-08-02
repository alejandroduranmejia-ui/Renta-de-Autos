import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, vehiclePhotos, vehicles } from "@/lib/db/schema";
import { getPublicPhotoUrl } from "@/lib/storage";

export type MyBooking = {
  id: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  holdExpiresAt: Date | null;
  priceCents: number;
  depositHoldCents: number;
  currency: string;
  vehicleId: string;
  vehicleName: string;
  photoUrl: string | null;
};

export async function listMyBookings(renterId: string): Promise<MyBooking[]> {
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      holdExpiresAt: bookings.holdExpiresAt,
      priceCents: bookings.priceCents,
      depositHoldCents: bookings.depositHoldCents,
      currency: bookings.currency,
      vehicleId: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
    })
    .from(bookings)
    .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
    .where(eq(bookings.renterId, renterId))
    .orderBy(desc(bookings.createdAt));

  if (rows.length === 0) return [];

  const photos = await db
    .select({
      vehicleId: vehiclePhotos.vehicleId,
      storagePath: vehiclePhotos.storagePath,
    })
    .from(vehiclePhotos)
    .where(
      inArray(
        vehiclePhotos.vehicleId,
        rows.map((r) => r.vehicleId),
      ),
    )
    .orderBy(vehiclePhotos.position);

  const firstPhotoByVehicle = new Map<string, string>();
  for (const photo of photos) {
    if (!firstPhotoByVehicle.has(photo.vehicleId)) {
      firstPhotoByVehicle.set(photo.vehicleId, photo.storagePath);
    }
  }

  return rows.map((row) => {
    const storagePath = firstPhotoByVehicle.get(row.vehicleId);
    return {
      id: row.id,
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      holdExpiresAt: row.holdExpiresAt,
      priceCents: row.priceCents,
      depositHoldCents: row.depositHoldCents,
      currency: row.currency,
      vehicleId: row.vehicleId,
      vehicleName: `${row.make} ${row.model}`,
      photoUrl: storagePath ? getPublicPhotoUrl(storagePath) : null,
    };
  });
}
