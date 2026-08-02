import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Espejo de auth.users de Supabase — nunca la fuente de verdad de credenciales.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [uniqueIndex("uq_users_email").on(t.email)],
);

export const identityVerifications = pgTable(
  "identity_verifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    documentType: text("document_type").notNull(),
    filePath: text("file_path").notNull(),
    status: text("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_identity_verifications_user_id").on(t.userId),
    check(
      "chk_identity_status",
      sql`${t.status} in ('pending','approved','rejected')`,
    ),
    check(
      "chk_identity_doc_type",
      sql`${t.documentType} in ('cedula','licencia')`,
    ),
  ],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    make: text("make").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    plate: text("plate").notNull(),
    color: text("color").notNull(),
    seats: integer("seats").notNull(),
    dailyPriceCents: integer("daily_price_cents").notNull(),
    currency: text("currency").notNull().default("COP"),
    description: text("description"),
    // Campos de descubrimiento — nullable a propósito: los vehículos ya publicados no tienen estos
    // datos y no se inventan por backfill. La UI trata null como "sin especificar" y el filtro
    // correspondiente simplemente no los alcanza.
    //
    // `zone` es el barrio/sector DENTRO de la única ciudad del piloto, no una segunda ciudad —
    // multi-ciudad sigue siendo non-goal (blueprint.md §1).
    zone: text("zone"),
    pickupNotes: text("pickup_notes"),
    vehicleType: text("vehicle_type"),
    transmission: text("transmission"),
    fuelType: text("fuel_type"),
    // Arreglo de claves de `src/lib/vehicle-features.ts`, validado con Zod en el mutation. Se
    // eligió `jsonb` sobre una tabla puente porque a la escala del piloto (20 vehículos) una
    // tabla extra es ceremonia sin beneficio: nunca se consulta "qué vehículos tienen X" desde
    // SQL, solo se lee la lista completa junto con el vehículo. Si algún día hay que filtrar por
    // característica, esto se normaliza con una migración expand→migrate→contract.
    features: jsonb("features").$type<string[]>().notNull().default([]),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_vehicles_owner_id").on(t.ownerId),
    index("idx_vehicles_status")
      .on(t.status)
      .where(sql`${t.status} = 'active'`),
    // Índices de descubrimiento: la lista pública filtra y ordena por estas dos columnas en cada
    // búsqueda, siempre acotada a `status = 'active'`.
    index("idx_vehicles_zone").on(t.zone).where(sql`${t.status} = 'active'`),
    index("idx_vehicles_daily_price")
      .on(t.dailyPriceCents)
      .where(sql`${t.status} = 'active'`),
    check(
      "chk_vehicle_status",
      sql`${t.status} in ('draft','pending_review','active','inactive','rejected')`,
    ),
    check(
      "chk_vehicle_type",
      sql`${t.vehicleType} is null or ${t.vehicleType} in ('sedan','suv','hatchback','pickup','van','camioneta','deportivo')`,
    ),
    check(
      "chk_vehicle_transmission",
      sql`${t.transmission} is null or ${t.transmission} in ('automatica','mecanica')`,
    ),
    check(
      "chk_vehicle_fuel_type",
      sql`${t.fuelType} is null or ${t.fuelType} in ('gasolina','diesel','hibrido','electrico','gas')`,
    ),
  ],
);

export const vehiclePhotos = pgTable(
  "vehicle_photos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    storagePath: text("storage_path").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_vehicle_photos_vehicle_id").on(t.vehicleId)],
);

export const vehicleDocuments = pgTable(
  "vehicle_documents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    documentType: text("document_type").notNull(),
    filePath: text("file_path").notNull(),
    expiresAt: date("expires_at"),
    status: text("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_vehicle_documents_vehicle_id").on(t.vehicleId),
    check(
      "chk_vehicle_doc_type",
      sql`${t.documentType} in ('tarjeta_circulacion','poliza_seguro')`,
    ),
    check(
      "chk_vehicle_doc_status",
      sql`${t.status} in ('pending','approved','rejected')`,
    ),
  ],
);

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    weekday: integer("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    validFrom: date("valid_from"),
    validUntil: date("valid_until"),
  },
  (t) => [
    index("idx_availability_rules_vehicle_id").on(t.vehicleId),
    check("chk_availability_rules_weekday", sql`${t.weekday} between 0 and 6`),
  ],
);

export const availabilityExceptions = pgTable(
  "availability_exceptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    type: text("type").notNull(),
    reason: text("reason"),
  },
  (t) => [
    index("idx_availability_exceptions_vehicle_id").on(t.vehicleId),
    check(
      "chk_availability_exceptions_type",
      sql`${t.type} in ('block','open')`,
    ),
  ],
);

// El rango `blocking_range` (generado) y el EXCLUDE USING gist que impide el doble-booking
// se agregan a mano en la migración SQL que `db:generate` produce — Drizzle no expresa
// exclusion constraints nativamente (ver blueprint.md §9, paso 3).
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => users.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("held"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    priceCents: integer("price_cents").notNull(),
    commissionCents: integer("commission_cents").notNull(),
    depositHoldCents: integer("deposit_hold_cents").notNull(),
    currency: text("currency").notNull(),
    timezoneAtBooking: text("timezone_at_booking").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_bookings_vehicle_id").on(t.vehicleId),
    index("idx_bookings_renter_id").on(t.renterId),
    check(
      "chk_booking_status",
      sql`${t.status} in ('held','confirmed','active','completed','cancelled')`,
    ),
  ],
);

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    stripeAccountId: text("stripe_account_id").notNull(),
    payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
    verificationStatus: text("verification_status")
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_connected_accounts_owner_id").on(t.ownerId),
    uniqueIndex("uq_connected_accounts_stripe_account_id").on(
      t.stripeAccountId,
    ),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: text("provider").notNull().default("stripe"),
    externalEventId: text("external_event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_payment_events_external_event_id").on(t.externalEventId),
  ],
);

export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    depositHoldCents: integer("deposit_hold_cents").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("uq_charges_booking_id").on(t.bookingId),
    uniqueIndex("uq_charges_stripe_payment_intent_id").on(
      t.stripePaymentIntentId,
    ),
    check(
      "chk_charge_status",
      sql`${t.status} in ('requires_capture','succeeded','refunded','failed')`,
    ),
  ],
);

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    stripeTransferId: text("stripe_transfer_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("idx_transfers_booking_id").on(t.bookingId),
    uniqueIndex("uq_transfers_stripe_transfer_id").on(t.stripeTransferId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("idx_messages_booking_id").on(t.bookingId)],
);

// Append-only — nunca actualizado ni borrado por código de aplicación (blueprint.md §14).
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: uuid("target_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Rate limiting basado en Postgres (blueprint.md §14, §20.3 decisión #3) — evita depender de
// Redis/Upstash a la escala de un piloto de 20 usuarios.
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("uq_rate_limit_events_key_window").on(t.key, t.windowStart),
  ],
);
