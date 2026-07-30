import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cliente de service_role — ignora RLS y solo se usa server-side. El bucket "private" nunca es
// público; nada en este proyecto genera una URL pública para él (blueprint.md §8, §14).
function serviceClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function uploadPrivate(
  path: string,
  file: Buffer,
  contentType: string,
) {
  const { error } = await serviceClient()
    .storage.from("private")
    .upload(path, file, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export async function getSignedUrl(path: string, ttlSeconds: number) {
  const { data, error } = await serviceClient()
    .storage.from("private")
    .createSignedUrl(path, ttlSeconds);
  if (error) throw error;
  return data.signedUrl;
}
