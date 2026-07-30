-- Custom SQL migration file, put your code below! --

-- La conexión de la app usa el rol `postgres` (superusuario), que ignora RLS por completo — así
-- que ninguna política de las tablas anteriores era necesaria hasta ahora. `ChatThread` es el
-- primer cliente que habla con Postgres directamente desde el navegador (vía Supabase Realtime,
-- con la sesión del usuario, no la llave de servicio), así que aquí sí importa: sin esto, un
-- usuario ajeno a la reserva podría suscribirse al canal e igual recibir los INSERTs de otra
-- reserva (blueprint.md §9, paso 13 — "verificado server-side al emitir el token de suscripción").
alter table "messages" enable row level security;

-- La política necesita leer `bookings`/`vehicles` para saber si el usuario es parte de la
-- reserva, pero `authenticated` no tiene (ni debe tener) SELECT directo sobre esas tablas — eso
-- expondría CUALQUIER reserva/vehículo de CUALQUIER usuario vía PostgREST, rompiendo el patrón
-- "404 nunca 403" que el resto de la app respeta a nivel de servicio (verificado en vivo: sin
-- esta función, Postgres exige el grant directo sobre bookings/vehicles para evaluar la
-- subconsulta de la política, aunque el cliente solo pida `messages`). `SECURITY DEFINER` deja
-- que la función corra con los privilegios de quien la creó (este rol, que sí puede leer esas
-- tablas), sin ampliar los grants de `authenticated` más allá de esta única comprobación.
create or replace function public.is_booking_party(p_booking_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from bookings b
    join vehicles v on v.id = b.vehicle_id
    where b.id = p_booking_id
      and (b.renter_id = p_user_id or v.owner_id = p_user_id)
  );
$$;

revoke all on function public.is_booking_party(uuid, uuid) from public;
grant execute on function public.is_booking_party(uuid, uuid) to authenticated;

create policy "messages_select_booking_parties"
on "messages" for select
to authenticated
using (public.is_booking_party("messages".booking_id, auth.uid()));

-- Sin este GRANT, PostgREST/Realtime rechazan cualquier lectura de `authenticated` con permiso
-- denegado ANTES de siquiera evaluar la política de arriba — verificado en vivo, las tablas
-- previas nunca necesitaron esto porque solo las tocaba la conexión con rol `postgres`
-- (superusuario, que no pasa por grants ni RLS).
grant select on "messages" to authenticated;

-- Solo se otorga SELECT — los envíos siempre pasan por `sendMessage()` (Server Action, conexión
-- con rol `postgres`), así que no hay ningún flujo real que necesite INSERT como `authenticated`.
-- No agregar ese grant/policy: sería superficie de ataque sin ningún caso de uso detrás.

-- Habilita los eventos de Postgres Changes sobre esta tabla — sin esto, Realtime nunca emite
-- nada aunque las políticas de arriba sean correctas.
alter publication supabase_realtime add table "messages";