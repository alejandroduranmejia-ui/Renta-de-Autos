-- Custom SQL migration file, put your code below! --

-- Bucket privado para documentos de identidad y de vehículo. Nunca público — accedido solo desde
-- el servidor con la llave de service_role (que ignora RLS), nunca desde el cliente con la llave
-- anon. blueprint.md §5/§8.
insert into storage.buckets (id, name, public)
values ('private', 'private', false)
on conflict (id) do nothing;
