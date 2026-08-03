import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Un solo cliente exportado — src/lib/db/ es el único lugar del repo que abre una conexión.
//
// Las opciones NO son opcionales en serverless (incidente en producción del 2026-08-02): cada
// instancia de Vercel abre su propio pool, `postgres.js` abre hasta 10 conexiones por defecto, y
// el pooler de Supabase en modo sesión admite 15 clientes EN TOTAL. Dos instancias concurrentes
// bastaban para agotarlo y la base respondía
// `(EMAXCONNSESSION) max clients reached in session mode`, tumbando todas las páginas — incluida
// la portada — en cuanto había más de una visita simultánea.
const client = postgres(env.DATABASE_URL as string, {
  // Una conexión por instancia. Las consultas concurrentes de una misma petición se encolan sobre
  // ella en vez de abrir conexiones nuevas; a esta escala el costo es irrelevante frente a que la
  // base rechace la conexión entera.
  max: 1,
  // Obligatorio si DATABASE_URL apunta al pooler en modo transacción (puerto 6543), donde una
  // sentencia preparada no sobrevive entre transacciones. Inofensivo en modo sesión, así que es
  // seguro para las dos configuraciones.
  prepare: false,
  // Devuelve la conexión al pooler cuando la instancia queda ociosa, en vez de retenerla mientras
  // Vercel mantiene el contenedor caliente.
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
