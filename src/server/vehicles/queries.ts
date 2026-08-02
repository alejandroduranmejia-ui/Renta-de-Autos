import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  notExists,
} from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  identityVerifications,
  users,
  vehicleDocuments,
  vehiclePhotos,
  vehicles,
} from "@/lib/db/schema";
import { getPublicPhotoUrl } from "@/lib/storage";
import { REQUIRED_DOCUMENT_TYPES } from "@/server/vehicles/service";

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

// Datos públicos del dueño. Nunca incluye correo ni teléfono — eso solo se comparte por el chat
// de una reserva ya creada (blueprint.md §14).
export type VehicleHost = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  memberSince: Date;
  completedTrips: number;
};

// Se consulta en vivo en vez de deducirse de `status = 'active'`: activar exige identidad y
// documentos aprobados, pero un documento puede rechazarse o vencer después de la activación, y
// el badge no debe seguir afirmando algo que dejó de ser cierto.
export type VehicleVerification = {
  identityApproved: boolean;
  documentsApproved: boolean;
};

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
  host: VehicleHost;
  verification: VehicleVerification;
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
      ownerId: vehicles.ownerId,
      hostFullName: users.fullName,
      hostAvatarUrl: users.avatarUrl,
      hostMemberSince: users.createdAt,
    })
    .from(vehicles)
    .innerJoin(users, eq(users.id, vehicles.ownerId))
    .where(
      and(
        eq(vehicles.id, id),
        eq(vehicles.status, "active"),
        isNull(vehicles.deletedAt),
      ),
    )
    .limit(1);

  if (!vehicle) return null;

  const { ownerId, hostFullName, hostAvatarUrl, hostMemberSince, ...rest } =
    vehicle;

  const [photos, identityRows, approvedDocTypes, tripRows] = await Promise.all([
    db
      .select({ storagePath: vehiclePhotos.storagePath })
      .from(vehiclePhotos)
      .where(eq(vehiclePhotos.vehicleId, id))
      .orderBy(asc(vehiclePhotos.position)),
    db
      .select({ id: identityVerifications.id })
      .from(identityVerifications)
      .where(
        and(
          eq(identityVerifications.userId, ownerId),
          eq(identityVerifications.status, "approved"),
        ),
      )
      .limit(1),
    db
      .selectDistinct({ documentType: vehicleDocuments.documentType })
      .from(vehicleDocuments)
      .where(
        and(
          eq(vehicleDocuments.vehicleId, id),
          eq(vehicleDocuments.status, "approved"),
        ),
      ),
    db
      .select({ value: count() })
      .from(bookings)
      .innerJoin(vehicles, eq(vehicles.id, bookings.vehicleId))
      .where(
        and(eq(vehicles.ownerId, ownerId), eq(bookings.status, "completed")),
      ),
  ]);

  const approved = new Set(approvedDocTypes.map((d) => d.documentType));

  return {
    ...rest,
    photoUrls: photos.map((p) => getPublicPhotoUrl(p.storagePath)),
    host: {
      id: ownerId,
      fullName: hostFullName,
      avatarUrl: hostAvatarUrl,
      memberSince: hostMemberSince,
      completedTrips: tripRows[0]?.value ?? 0,
    },
    verification: {
      identityApproved: identityRows.length > 0,
      documentsApproved: REQUIRED_DOCUMENT_TYPES.every((type) =>
        approved.has(type),
      ),
    },
  };
}
