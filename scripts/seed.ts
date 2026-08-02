// Debe ser el PRIMER import del archivo (no una llamada de función entre imports — todos los
// imports estáticos de este archivo, incluyendo los transitivos de "@/lib/db", se resuelven antes
// de que corra cualquier statement normal, así que una función invocada "antes" en el texto igual
// llega tarde. Ver scripts/load-env.ts para el porqué completo, verificado en vivo).
import "./load-env";
import { db } from "@/lib/db";
import {
  bookings,
  connectedAccounts,
  identityVerifications,
  users,
  vehicleDocuments,
  vehiclePhotos,
  vehicles,
} from "@/lib/db/schema";

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const OWNER_ID = "00000000-0000-0000-0000-000000000002";
const RENTER_ID = "00000000-0000-0000-0000-000000000003";
const VEHICLE_ID = "00000000-0000-0000-0000-000000000010";
const BOOKING_ID = "00000000-0000-0000-0000-000000000020";

async function seed() {
  await db.insert(users).values([
    {
      id: ADMIN_ID,
      email: "admin@example.local",
      fullName: "Admin",
      isAdmin: true,
    },
    {
      id: OWNER_ID,
      email: "owner@example.local",
      fullName: "Dueño de Ejemplo",
      phone: "+573000000001",
    },
    {
      id: RENTER_ID,
      email: "renter@example.local",
      fullName: "Arrendatario de Ejemplo",
      phone: "+573000000002",
    },
  ]);

  await db.insert(identityVerifications).values([
    {
      userId: OWNER_ID,
      documentType: "cedula",
      filePath: "identity/seed-owner.jpg",
      status: "approved",
      reviewedBy: ADMIN_ID,
      reviewedAt: new Date(),
    },
    {
      userId: RENTER_ID,
      documentType: "cedula",
      filePath: "identity/seed-renter.jpg",
      status: "approved",
      reviewedBy: ADMIN_ID,
      reviewedAt: new Date(),
    },
  ]);

  await db.insert(connectedAccounts).values({
    ownerId: OWNER_ID,
    stripeAccountId: "acct_seed_example",
    payoutsEnabled: true,
    verificationStatus: "verified",
  });

  await db.insert(vehicles).values({
    id: VEHICLE_ID,
    ownerId: OWNER_ID,
    make: "Mazda",
    model: "3",
    year: 2021,
    plate: "SEED123",
    color: "Gris",
    seats: 5,
    dailyPriceCents: 120_000,
    currency: "COP",
    description: "Vehículo de ejemplo creado por el seed.",
    zone: "Chapinero",
    pickupNotes: "Frente al portal, parqueadero de visitantes.",
    vehicleType: "sedan",
    transmission: "automatica",
    fuelType: "gasolina",
    features: [
      "camara_reversa",
      "frenos_abs",
      "bluetooth",
      "apple_carplay",
      "aire_acondicionado",
      "vidrios_electricos",
    ],
    status: "active",
  });

  await db.insert(vehiclePhotos).values({
    vehicleId: VEHICLE_ID,
    storagePath: "vehicle-photos/seed-1.jpg",
    position: 0,
  });

  await db.insert(vehicleDocuments).values([
    {
      vehicleId: VEHICLE_ID,
      documentType: "tarjeta_circulacion",
      filePath: "vehicle-docs/seed-tarjeta.jpg",
      status: "approved",
      reviewedBy: ADMIN_ID,
      reviewedAt: new Date(),
    },
    {
      vehicleId: VEHICLE_ID,
      documentType: "poliza_seguro",
      filePath: "vehicle-docs/seed-poliza.jpg",
      expiresAt: "2027-01-01",
      status: "approved",
      reviewedBy: ADMIN_ID,
      reviewedAt: new Date(),
    },
  ]);

  await db.insert(bookings).values({
    id: BOOKING_ID,
    vehicleId: VEHICLE_ID,
    renterId: RENTER_ID,
    startsAt: new Date("2026-08-10T10:00:00Z"),
    endsAt: new Date("2026-08-12T10:00:00Z"),
    status: "confirmed",
    priceCents: 240_000,
    commissionCents: 24_000,
    depositHoldCents: 200_000,
    currency: "COP",
    timezoneAtBooking: "America/Bogota",
  });

  console.log("Seed completado: 1 vehículo activo, 1 reserva confirmada.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
