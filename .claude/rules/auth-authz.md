---
description: El patrón de autenticación y autorización de este proyecto
paths:
  - "src/server/auth/**"
  - "src/server/**/mutations.ts"
  - "src/server/**/queries.ts"
---

- `getSession()` es el único punto que lee la cookie de sesión. Ningún otro archivo lee cookies de auth
  directamente.
- Toda mutación llama a `requireUser()` o `requireAdmin()` como primera verificación de identidad,
  después de parsear el input, antes de tocar la base de datos.
- La autorización específica del recurso (¿es dueño de esto?) es una verificación adicional, siempre
  server-side, nunca solo en el layout ni solo en la UI.
- Cruzar el límite de otro usuario devuelve **404, nunca 403** — 403 confirma que el recurso existe.
- El aprovisionamiento just-in-time de la fila `users` vive dentro de `requireUser()`; el webhook de
  Supabase es un atajo, no la única garantía.
