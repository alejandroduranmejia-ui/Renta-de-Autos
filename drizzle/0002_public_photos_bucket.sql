-- Custom SQL migration file, put your code below! --

-- Bucket público solo para fotos de vehículos (no sensibles) — blueprint.md §4, vehicle_photos.
-- Documentos de identidad y del vehículo NUNCA van aquí, van al bucket "private".
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;
