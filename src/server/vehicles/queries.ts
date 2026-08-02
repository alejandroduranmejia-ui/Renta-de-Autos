import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  notExists,
  type SQL,
} from "drizzle-orm";
import { VEHICLE_TIMEZONE } from "@/lib/date";
import { db } from "@/lib/db";
import {
  availabilityExceptions,
  availabilityRules,
  bookings,
  identityVerifications,
  users,
  vehicleDocuments,
  vehiclePhotos,
  vehicles,
} from "@/lib/db/schema";
import { getPublicPhotoUrl } from "@/lib/storage";
import { computeSlots } from "@/server/bookings/availability";
import { MIN_NOTICE_HOURS } from "@/server/bookings/service";
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
  zone: string | null;
  vehicleType: string | null;
  transmission: string | null;
  fuelType: string | null;
  photoUrl: string | null;
};

export type VehicleSort = "precio_asc" | "precio_desc" | "recientes";

export type VehicleListingFilters = {
  from?: Date;
  to?: Date;
  minPriceCents?: number;
  maxPriceCents?: number;
  zone?: string;
  vehicleTypes?: string[];
  transmission?: string;
  fuelTypes?: string[];
  minSeats?: number;
  sort?: VehicleSort;
  page?: number;
  perPage?: number;
};

export type VehicleListingPage = {
  items: ActiveVehicleListing[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

export const DEFAULT_PER_PAGE = 12;

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

const ORDER_BY: Record<VehicleSort, () => SQL> = {
  // Por defecto, más barato primero. Antes era `createdAt asc` — el vehículo publicado hace más
  // tiempo primero, que no es un criterio útil para quien busca.
  precio_asc: () => asc(vehicles.dailyPriceCents),
  precio_desc: () => desc(vehicles.dailyPriceCents),
  recientes: () => desc(vehicles.createdAt),
};

export async function listActiveVehicles(
  filters: VehicleListingFilters = {},
): Promise<VehicleListingPage> {
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
  if (filters.zone) {
    conditions.push(eq(vehicles.zone, filters.zone));
  }
  if (filters.vehicleTypes?.length) {
    conditions.push(inArray(vehicles.vehicleType, filters.vehicleTypes));
  }
  if (filters.transmission) {
    conditions.push(eq(vehicles.transmission, filters.transmission));
  }
  if (filters.fuelTypes?.length) {
    conditions.push(inArray(vehicles.fuelType, filters.fuelTypes));
  }
  if (filters.minSeats !== undefined) {
    conditions.push(gte(vehicles.seats, filters.minSeats));
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
    // Un vehículo cuyo dueño bloqueó esas fechas tampoco debe aparecer disponible. Antes este
    // filtro solo miraba `bookings` y las excepciones se ignoraban por completo.
    conditions.push(
      notExists(
        db
          .select()
          .from(availabilityExceptions)
          .where(
            and(
              eq(availabilityExceptions.vehicleId, vehicles.id),
              eq(availabilityExceptions.type, "block"),
              lte(availabilityExceptions.startsAt, to),
              gte(availabilityExceptions.endsAt, from),
            ),
          ),
      ),
    );
  }

  const where = and(...conditions);
  const perPage = filters.perPage ?? DEFAULT_PER_PAGE;
  const page = Math.max(1, filters.page ?? 1);

  const [totalRow] = await db
    .select({ value: count() })
    .from(vehicles)
    .where(where);
  const total = totalRow?.value ?? 0;

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
      zone: vehicles.zone,
      vehicleType: vehicles.vehicleType,
      transmission: vehicles.transmission,
      fuelType: vehicles.fuelType,
    })
    .from(vehicles)
    .where(where)
    .orderBy(ORDER_BY[filters.sort ?? "precio_asc"]())
    .limit(perPage)
    .offset((page - 1) * perPage);

  return {
    items: await attachFirstPhoto(activeVehicles),
    total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Un vehículo sin reglas semanales configuradas se considera abierto todos los días.
 *
 * Es el comportamiento que el producto tuvo siempre (nadie podía definir reglas porque no había
 * UI), y hay que preservarlo: si `computeSlots` recibiera una lista vacía de reglas marcaría
 * TODOS los días como no disponibles y el calendario quedaría completamente bloqueado para cada
 * vehículo ya publicado. Las reglas son opt-in; lo que sí bloquea siempre son las excepciones y
 * las reservas existentes. */
const ALWAYS_OPEN = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  startTime: "00:00:00",
  endTime: "23:59:00",
}));

const AVAILABILITY_HORIZON_DAYS = 180;

/** Días que el calendario debe mostrar deshabilitados, en formato "YYYY-MM-DD".
 *
 * Advisorio, igual que el filtro de fechas de `listActiveVehicles`: la autoridad real contra el
 * doble booking sigue siendo el exclusion constraint `excl_bookings_no_overlap`. */
export async function getVehicleUnavailableDates(
  vehicleId: string,
  now: Date = new Date(),
): Promise<string[]> {
  const [rules, exceptions, existingBookings] = await Promise.all([
    db
      .select({
        weekday: availabilityRules.weekday,
        startTime: availabilityRules.startTime,
        endTime: availabilityRules.endTime,
        validFrom: availabilityRules.validFrom,
        validUntil: availabilityRules.validUntil,
      })
      .from(availabilityRules)
      .where(eq(availabilityRules.vehicleId, vehicleId)),
    db
      .select({
        startsAt: availabilityExceptions.startsAt,
        endsAt: availabilityExceptions.endsAt,
        type: availabilityExceptions.type,
      })
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.vehicleId, vehicleId)),
    db
      .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
      .from(bookings)
      .where(
        and(
          eq(bookings.vehicleId, vehicleId),
          inArray(bookings.status, ["held", "confirmed", "active"]),
        ),
      ),
  ]);

  const slots = computeSlots({
    rules: rules.length > 0 ? rules : ALWAYS_OPEN,
    exceptions: exceptions.map((e) => ({
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      type: e.type as "block" | "open",
    })),
    existingBookings,
    now,
    vehicleTimeZone: VEHICLE_TIMEZONE,
    rangeStartDays: 0,
    rangeEndDays: AVAILABILITY_HORIZON_DAYS,
    minNoticeHours: MIN_NOTICE_HOURS,
  });

  return slots.filter((slot) => !slot.available).map((slot) => slot.date);
}

// Zonas que hoy tienen al menos un vehículo activo. Alimenta el desplegable de búsqueda: ofrecer
// una zona sin resultados es una vía muerta garantizada.
export async function listActiveZones(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ zone: vehicles.zone })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.status, "active"),
        isNull(vehicles.deletedAt),
        isNotNull(vehicles.zone),
      ),
    )
    .orderBy(asc(vehicles.zone));

  return rows.map((row) => row.zone).filter((zone): zone is string => !!zone);
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
  zone: string | null;
  pickupNotes: string | null;
  vehicleType: string | null;
  transmission: string | null;
  fuelType: string | null;
  features: string[];
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
      zone: vehicles.zone,
      pickupNotes: vehicles.pickupNotes,
      vehicleType: vehicles.vehicleType,
      transmission: vehicles.transmission,
      fuelType: vehicles.fuelType,
      features: vehicles.features,
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
