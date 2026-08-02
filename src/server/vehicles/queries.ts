import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  notExists,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, vehiclePhotos, vehicles } from "@/lib/db/schema";
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

export type VehicleListingFilters = {
  from?: Date;
  to?: Date;
  minPriceCents?: number;
  maxPriceCents?: number;
};

async function attachFirstPhoto<T extends { id: string }>(
  rows: T[],
): Promise<(T & { photoUrl: string | null })[]> {
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
        rows.map((v) => v.id),
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

  return rows.map((row) => {
    const storagePath = firstPhotoPathByVehicle.get(row.id);
    return {
      ...row,
      photoUrl: storagePath ? getPublicPhotoUrl(storagePath) : null,
    };
  });
}

export async function listActiveVehicles(
  filters: VehicleListingFilters = {},
): Promise<ActiveVehicleListing[]> {
  const conditions = [
    eq(vehicles.status, "active"),
    isNull(vehicles.deletedAt),
  ];

  if (filters.minPriceCents !== undefined) {
    conditions.push(gte(vehicles.dailyPriceCents, filters.minPriceCents));
  }
  if (filters.maxPriceCents !== undefined) {
    conditions.push(lte(vehicles.dailyPriceCents, filters.maxPriceCents));
  }
  if (filters.from && filters.to) {
    const { from, to } = filters;
    // Mismo predicado de solape que el exclusion constraint real de `bookings`
    // (`excl_bookings_no_overlap`, .claude/rules/database.md) — este filtro es solo de UX, la
    // defensa real contra doble reserva sigue siendo el constraint en la base de datos.
    conditions.push(
      notExists(
        db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.vehicleId, vehicles.id),
              inArray(bookings.status, ["held", "confirmed", "active"]),
              lte(bookings.startsAt, to),
              gte(bookings.endsAt, from),
            ),
          ),
      ),
    );
  }

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
    .where(and(...conditions))
    .orderBy(asc(vehicles.createdAt));

  return attachFirstPhoto(activeVehicles);
}

export type VehicleDetail = {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  seats: number;
  dailyPriceCents: number;
  currency: string;
  description: string | null;
  photoUrls: string[];
};

export async function getVehicleDetail(
  id: string,
): Promise<VehicleDetail | null> {
  const [vehicle] = await db
    .select({
      id: vehicles.id,
      make: vehicles.make,
      model: vehicles.model,
      year: vehicles.year,
      color: vehicles.color,
      seats: vehicles.seats,
      dailyPriceCents: vehicles.dailyPriceCents,
      currency: vehicles.currency,
      description: vehicles.description,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.id, id),
        eq(vehicles.status, "active"),
        isNull(vehicles.deletedAt),
      ),
    )
    .limit(1);

  if (!vehicle) return null;

  const photos = await db
    .select({ storagePath: vehiclePhotos.storagePath })
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, id))
    .orderBy(asc(vehiclePhotos.position));

  return {
    ...vehicle,
    photoUrls: photos.map((p) => getPublicPhotoUrl(p.storagePath)),
  };
}
