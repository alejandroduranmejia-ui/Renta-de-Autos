# Renta de Vehículos entre Particulares

Marketplace de dos lados que conecta arrendadores de vehículos con arrendatarios en una misma ciudad.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` — http://localhost:3000 |
| Build | `pnpm build` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint / format | `pnpm exec biome ci .` · `pnpm exec biome check --write .` |
| Unit/integration tests | `pnpm test` · un archivo: `pnpm test tests/path/to/file.test.ts` |
| E2E | `pnpm exec playwright test` |
| DB migrar | `pnpm db:migrate` |
| DB generar migración | `pnpm db:generate` |
| DB seed | `pnpm db:seed` |
| DB local | `supabase start` / `supabase stop` |

**Gate:** `pnpm exec tsc --noEmit && pnpm exec biome ci . && pnpm test` debe pasar antes de marcar
cualquier tarea como hecha.

Runtime pinneado en `.nvmrc` (Node 24). Versiones de dependencias en `pnpm-lock.yaml` — léelo, nunca
adivines una.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Postgres vía Supabase · Drizzle ORM ·
Supabase Auth · Stripe Connect · Supabase Realtime (chat) · Resend (email) · Sentry · Vercel.

## Architecture

**Request path.** Navegador → Server Component (`src/app/vehiculos/[id]/page.tsx`) → función de
consulta en `src/server/*` → `src/lib/db/index.ts` → Postgres. Las mutaciones pasan por Server Actions
en el mismo árbol de `src/server/*`, nunca por un `fetch` de cliente a una ruta de API propia — las
únicas rutas de API reales son webhooks, el generador de URLs firmadas, y el cron.

**Boundaries.** Cruzar una de estas en la dirección equivocada rompe el build:

| Layer | May import from | Must never |
|---|---|---|
| `src/app/**` (rutas) | `components`, `server`, `lib` | Importar `db/` directamente |
| `src/components/**` | `lib`, otros componentes | Importar `server/` o `db/` |
| `src/server/**` | `db`, `lib` | Importar React o algo de `components/` — única excepción: `cache()` (ver nota abajo) |
| `src/lib/db/**` | nada interno | Importar `server/` |

**Excepción de la tabla de límites (2026-08-02).** `src/server/vehicles/queries.ts` importa `cache`
de React. Es la única importación de React permitida en `src/server/**`, y existe porque una página
con `generateMetadata` ejecuta su consulta **dos veces por petición** (una para la metadata, otra
para el componente), lo que duplicaba las consultas de la ficha y contribuyó al incidente de
conexiones agotadas de ese día. `cache()` no necesita el request context de Next.js para
importarse, así que no rompe los tests de Vitest — que es lo que la regla protege. No se extiende a
`service.ts` ni a `mutations.ts`.

**Where things live.**

| Concern | Single source of truth |
|---|---|
| Esquema de DB | `src/lib/db/schema.ts` — cambia aquí, luego `pnpm db:generate && pnpm db:migrate` |
| Acceso a env | `src/lib/env.ts` — validado al arrancar; nunca leer `process.env` en otro lugar |
| Tokens de diseño | `src/app/globals.css` — sin hex ni px crudos en componentes |
| Sesión de auth | `src/server/auth/session.ts` → `getSession()`, usado en todas partes |
| Autorización | `src/server/auth/guards.ts` → `requireUser()`, `requireAdmin()` — llamado en cada Server Action, no solo en el layout |

## Code rules

1. **Un componente por archivo. Máximo 300 líneas.** Más largo significa que debe dividirse.
2. **Alias de ruta `@/` → `src/`.** Sin `../../..`.
3. **Server-first.** Los componentes son Server Components por defecto. `"use client"` solo para
   estado, efectos, o manejadores de eventos — en la hoja más pequeña, nunca en un layout.
4. **Sin archivos barrel.** Importa del módulo fuente; `index.ts` de solo re-exportación rompe el
   tree-shaking.
5. **Valida en el borde.** Cada Server Action y route handler parsea su entrada con Zod antes de tocar
   lógica de negocio. Ningún input sin validar llega a `src/server/`.
6. **Toda mutación real vive en `src/server/<dominio>/service.ts`, como función pura sin `cookies()`/
   `headers()`, que recibe un actor ya resuelto.** El archivo `mutations.ts` (con `"use server"`) es
   solo el wrapper: resuelve el actor vía `requireUser()`/`requireAdmin()`, parsea el `FormData`, y
   delega. Esto es lo que hace la lógica testeable con Vitest — un test no tiene el request context
   de Next.js que `cookies()` necesita (verificado en vivo: llamar una Server Action directo desde
   un test de Vitest revienta ahí, no en la lógica de negocio).
7. **Autoriza después de validar, antes de trabajar.** `requireUser()`/`requireAdmin()` primero, luego
   la verificación específica del recurso — y repítela dentro de `service.ts` como segunda capa,
   nunca confiando en que el wrapper fue la única verificación. Cruzar el límite de otro usuario
   devuelve 404, nunca 403.
8. **Montos en centavos, siempre enteros.** Ni un `float` para dinero en todo el repo.
9. **Los webhooks de Stripe vuelven a consultar la API** antes de escribir estado — nunca confían en el
   payload del evento.
10. **Sin dependencia nueva sin una razón en el mensaje de commit.** Revisa la librería estándar o una
   dependencia existente primero.

## Design system

Tokens definidos una vez en `src/app/globals.css`. Los componentes solo referencian nombres de token.

| Role | Value (light) | Value (dark) | Used for |
|---|---|---|---|
| Primary | `#0071e3` | `#2997ff` | Botones primarios, enlaces, anillo de foco |
| Background | `#ffffff` | `#000000` | Fondo de página |
| Surface | `#ffffff` | `#1c1c1e` | Tarjetas, paneles |
| Border | `#e4e4e7` | `#424245` | Divisores, bordes de input |
| Muted | `#f5f5f7` | `#1c1c1e` | Fondos de foto ausente, estados hover |
| Text | `#1d1d1f` | `#f5f5f7` | Cuerpo |
| Muted text | `#6e6e73` | `#86868b` | Texto secundario |
| Destructive | `#d70015` | `#ff453a` | Errores, rechazo |
| Success | `#1d7a46` | `#30d158` | Confirmaciones |

- **Tipografía:** `-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif` — stack del
  sistema, sin descarga de fuente por red.
- **Escala:** 12 / 14 / 16 / 20 / 24 / 32 / 40px para UI general; los momentos "hero" (portada,
  encabezado de una página de detalle) pueden llevar tipografía `Display` a mayor escala aún
  (hasta ~64px en desktop) para dar impacto visual — decisión del 2026-08-01, ver nota abajo.
- **Espaciado:** base 4px — 4, 8, 12, 16, 24, 32, 48, 64, 96. Sin valores arbitrarios.
- **Radio:** 12px inputs/botones, 20px tarjetas, full (`9999px`) avatares/pills.
- **Superficies:** toda tarjeta usa la clase `.surface` de `globals.css` — nunca se repite
  `rounded-2xl border border-border bg-card` en un componente. En claro la separación la da la
  sombra (`--shadow-raised`), porque `--card` es blanco igual que el fondo; en oscuro una sombra no
  se ve sobre negro, así que `.surface` la anula y manda el borde. Decisión del 2026-08-07
  ("dirección B"): una tarjeta gris sobre fondo blanco se lee hundida, una blanca elevada se lee
  como un objeto.
- **Elevación:** `0 1px 2px rgba(0,0,0,.04)` reposo, `0 8px 24px rgba(0,0,0,.08)` flotante; hover
  en tarjetas puede subir un nivel de elevación con una transición suave.
- **Movimiento:** 200-250ms, `cubic-bezier(.4,0,.2,1)`. Solo `transform`/`opacity`. Respeta
  `prefers-reduced-motion`.
- **Layout:** ancho máximo 1120px (6xl en las páginas nuevas de descubrimiento); breakpoints
  480/768/1024/1280px; mobile-first.

**Nota (2026-08-01):** la regla original "nada de gradientes decorativos, nada de iconografía
ilustrativa" (blueprint.md §7) se relaja a pedido explícito del dueño del producto tras ver el
resultado en producción — lo sintió demasiado plano para convencer a un usuario nuevo. Se permite
un degradado sutil de marca (blobs difuminados en `--primary`) en secciones "hero" puntuales, y
tipografía de mayor escala en esos mismos momentos. Sigue sin haber iconografía ilustrativa fuera
de `lucide-react`, y el resto del sistema (colores, radios, un solo acento azul) no cambia.

## Environment

| Variable | Required | Used by | Source |
|---|---|---|---|
| `DATABASE_URL` / `DIRECT_DATABASE_URL` | yes | `src/lib/db/index.ts` | Panel de Supabase |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | `src/server/auth/*` | Panel de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | `src/lib/storage.ts` | Panel de Supabase |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | yes | `src/server/payments/*` | Dashboard de Stripe |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | no | `src/app/api/webhooks/stripe/route.ts` | Dashboard de Stripe — solo si el destino de "Cuentas conectadas" está separado del de "Tu cuenta" |
| `RESEND_API_KEY` | yes | Envío de correo | Dashboard de Resend |
| `CRON_SECRET` | yes | `src/app/api/cron/*` | Generado, valor aleatorio |
| `SENTRY_DSN` | yes | Observabilidad | Dashboard de Sentry |

`.env.example` está versionado y se mantiene sincronizado. Los archivos `.env*` con valores reales
nunca se versionan.

## Rules

Convenciones diferidas — lee el archivo correspondiente antes de editar esa área:

| File | Applies to |
|---|---|
| `.claude/rules/database.md` | `src/lib/db/**`, `drizzle/**` |
| `.claude/rules/payments.md` | `src/server/payments/**`, `src/app/api/webhooks/**` |
| `.claude/rules/auth-authz.md` | `src/server/auth/**`, `src/server/**/mutations.ts` |

## Non-negotiable

1. Ninguna verificación de autorización corre después del trabajo — siempre antes.
2. Ningún documento de identidad o de vehículo se sirve desde un bucket público, ni una URL firmada
   dura más de 60 segundos.
3. Ningún webhook de Stripe se procesa sin verificar la firma contra el cuerpo crudo primero.
4. Nunca commitear secretos, `.env`, o output de build generado.
5. Nunca editar a mano archivos generados (migraciones de `drizzle/`, el cliente de Supabase).
6. Nunca marcar una tarea como hecha con un comando de gate en rojo.
