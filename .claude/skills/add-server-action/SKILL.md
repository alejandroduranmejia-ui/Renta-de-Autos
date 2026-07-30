---
name: add-server-action
description: Use when adding a new mutation or query that the UI needs — a new Server Action or a new function in src/server/*. Ensures validation, authorization, and a test all land together, following this project's pattern.
---

# Add Server Action

## When to use
El usuario pide "agrega una acción", "nueva mutation", "necesito guardar/leer X desde la UI".

## Steps
1. Ubica la función en `src/server/<dominio>/mutations.ts` o `queries.ts` — nunca dentro de un
   componente ni de un route handler directamente.
2. Primera línea: parsea el input con un schema de Zod. Si falla, lanza/retorna el error de
   validación antes de tocar la base de datos.
3. Segunda línea: llama a `requireUser()` o `requireAdmin()` de `src/server/auth/guards.ts`.
4. Tercera parte: la lógica de autorización específica del recurso (¿es el dueño de esto? ¿es
   parte de esta reserva?) — devuelve 404 si no, nunca 403.
5. Escribe el test en `tests/integration/<dominio>.test.ts` cubriendo: el camino feliz, el caso de
   usuario no autorizado, y al menos un caso límite.
6. Si la acción escribe datos que un admin necesita auditar, agrega una fila a `audit_log` en la
   misma transacción.

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
