# Renta de Vehículos entre Particulares — agent instructions

Marketplace de dos lados que conecta arrendadores de vehículos con arrendatarios en una misma ciudad.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Dev server | `pnpm dev` — http://localhost:3000 |
| Build | `pnpm build` |
| Typecheck | `pnpm exec tsc --noEmit` |
| Lint / format | `pnpm exec biome ci .` · `pnpm exec biome check --write .` |
| Tests | `pnpm test` · `pnpm exec playwright test` |
| DB migrar | `pnpm db:migrate` |

## Non-negotiable

1. Ninguna verificación de autorización corre después del trabajo — siempre antes.
2. Ningún documento de identidad o de vehículo se sirve desde un bucket público, ni una URL firmada
   dura más de 60 segundos.
3. Ningún webhook de Stripe se procesa sin verificar la firma contra el cuerpo crudo primero.
4. Nunca commitear secretos, `.env`, o output de build generado.
5. Nunca editar a mano archivos generados (migraciones de `drizzle/`, el cliente de Supabase).
6. Nunca marcar una tarea como hecha con un comando de gate en rojo.

Arquitectura completa, límites de import, y sistema de diseño: ver `CLAUDE.md` en este directorio.
