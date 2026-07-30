import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

// Un solo cliente exportado — src/lib/db/ es el único lugar del repo que abre una conexión.
const client = postgres(env.DATABASE_URL as string);

export const db = drizzle(client, { schema });
