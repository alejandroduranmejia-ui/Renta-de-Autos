---
name: add-server-action
description: Use when adding a new mutation or query that the UI needs — a new Server Action or a new function in src/server/*. Ensures validation, authorization, and a test all land together, following this project's pattern.
---

# Add Server Action

## When to use
El usuario pide "agrega una acción", "nueva mutation", "necesito guardar/leer X desde la UI".

## Steps
1. **La lógica real va en `src/server/<dominio>/service.ts`** — una función que recibe un actor ya
   resuelto (`{ id, isAdmin, ... }`) y datos tipados, sin importar `cookies()`/`headers()`/
   `next/navigation` para nada. Repite ahí la verificación de autorización (segunda capa) aunque el
   wrapper ya la haya hecho — nunca confíes en que fue la única.
2. **`src/server/<dominio>/mutations.ts` (con `"use server"`) es solo el wrapper**: parsea el
   `FormData`/input con Zod, llama a `requireUser()`/`requireAdmin()` de
   `src/server/auth/guards.ts` para resolver el actor, y delega al `service.ts`. Nunca pongas la
   lógica de negocio aquí — un test de Vitest no puede llamar esta función directamente porque
   `requireUser()` necesita el request context de Next.js que Vitest no tiene.
3. Si el recurso es de otro usuario/no autorizado, el `service.ts` lanza (o el wrapper redirige a)
   404, nunca 403.
4. Escribe el test en `tests/integration/<dominio>.test.ts` importando **el `service.ts`
   directamente**, con un actor construido a mano — cubre el camino feliz, el caso no autorizado
   (verifica que no escribió nada), y al menos un caso límite.
5. Si la acción escribe datos que un admin necesita auditar, agrega una fila a `audit_log` en la
   misma transacción del `service.ts`.

## Verify
```bash
pnpm test tests/integration/<dominio>.test.ts   # expect: todos los tests pasan, incluyendo el de autorización
pnpm exec tsc --noEmit
```

## Do not
- No valides después de autorizar — el orden es: parsear, luego autorizar, luego trabajar.
- No confíes en un rol o permiso que venga del cliente — vuelve a consultarlo desde la sesión del
  servidor.
- No devuelvas 403 para un recurso de otro usuario — devuelve 404.
