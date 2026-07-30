---
name: add-migration
description: Use when the schema in src/lib/db/schema.ts needs to change — a new table, column, index, or constraint. Generates the migration, checks it against expand-then-contract rules, and applies it locally before it is committed.
---

# Add Migration

## When to use
El usuario pide agregar una tabla, columna, índice, o restricción a la base de datos, o dice "cambia
el esquema", "agrega una migración".

## Steps
1. Edita `src/lib/db/schema.ts` con el cambio deseado.
2. Corre `pnpm db:generate` — genera el archivo SQL en `drizzle/`. Nunca inventes el nombre del
   archivo; Drizzle Kit lo asigna.
3. Si el cambio es destructivo (dropear o renombrar una columna con datos reales), divídelo en
   expand → migrate → contract en migraciones separadas, no en una sola.
4. Si el cambio agrega una restricción que Drizzle no expresa nativamente (ej. un `EXCLUDE USING
   gist`), edita el archivo SQL generado a mano, en el mismo archivo — nunca en un archivo separado.
5. Aplica localmente con `pnpm db:migrate` contra el stack de `supabase start`.
6. Corre el seed de nuevo si el cambio afecta datos existentes: `pnpm db:seed`.

## Verify
```bash
pnpm db:migrate   # expect: exit 0, la migración se aplica sin error
pnpm exec tsc --noEmit   # expect: exit 0 — el tipo inferido del esquema sigue siendo válido en todo el código que lo usa
```

## Do not
- No edites una migración que ya corrió en cualquier entorno compartido — agrega una nueva.
- No agregues una columna de dinero como `float`/`double` — siempre entero en centavos.
- No olvides el índice en cada llave foránea nueva.
