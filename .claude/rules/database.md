---
description: Convenciones de esquema y migraciones
paths:
  - "src/lib/db/**"
  - "drizzle/**"
  - "scripts/seed.ts"
---

- Cada tabla tiene `id uuid primary key`, `created_at`, `updated_at` (mantenidos por trigger, nunca por
  código de aplicación).
- Nunca edites una migración que ya se aplicó en cualquier entorno compartido — agrega una nueva.
- Dinero siempre en centavos, entero, más una columna de moneda. Nunca `float`.
- Toda llave foránea lleva un índice.
- Soft-delete (`deleted_at`) solo en `vehicles`; el resto de tablas de auditoría/eventos son
  append-only y nunca se borran.
- El exclusion constraint de `bookings` (`blocking_range`, `EXCLUDE USING gist`) es la única defensa
  real contra el doble booking — el código de aplicación nunca es la única barrera.
- Nunca uses el editor de esquema del panel de Supabase — el esquema vive únicamente en
  `src/lib/db/schema.ts` y sus migraciones generadas.
