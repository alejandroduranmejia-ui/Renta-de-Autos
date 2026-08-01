import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { vehiclePhotos, vehicles } from "@/lib/db/schema";
import { getPublicPhotoUrl } from "@/lib/storage";

export type ActiveVehicleListing = {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  seats: number;
  dailyPriceCents: number;
  currency: string;
  photoUrl: string | null;
};

export async function listActiveVehicles(): Promise<ActiveVehicleListing[]> {
  const activeVehicles = await db
    .select({
      id: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      color: vehicles.color,
      seats: vehicles.seats,
      dailyPriceCents: vehicles.dailyPriceCents,
      currency: vehicles.currency,
    })
    .from(vehicles)
    .where(and(eq(vehicles.status, "active"), isNull(vehicles.deletedAt)))
    .orderBy(asc(vehicles.createdAt));

  if (activeVehicles.length === 0) return [];

  const photos = await db
    .select({
      vehicleId: vehiclePhotos.vehicleId,
      storagePath: vehiclePhotos.storagePath,
    })
    .from(vehiclePhotos)
    .where(
      inArray(
        vehiclePhotos.vehicleId,
        activeVehicles.map((v) => v.id),
      ),
    )
    .orderBy(asc(vehiclePhotos.position));

  // Solo la primera foto por vehículo (ya vienen ordenadas por `position`).
  const firstPhotoPathByVehicle = new Map<string, string>();
  for (const photo of photos) {
    if (!firstPhotoPathByVehicle.has(photo.vehicleId)) {
      firstPhotoPathByVehicle.set(photo.vehicleId, photo.storagePath);
    }
  }

  return activeVehicles.map((vehicle) => {
    const storagePath = firstPhotoPathByVehicle.get(vehicle.id);
    return {
      ...vehicle,
      photoUrl: storagePath ? getPublicPhotoUrl(storagePath) : null,
    };
  });
}
