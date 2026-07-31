import { createClient } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // no .env.local present — fine in production
}

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const LOCAL_DB_PATH = `file:${path.join(DATA_DIR, "nexuscx.sqlite")}`;


export const db = createClient(
  process.env.TURSO_DATABASE_URL
    ? {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }
    : { url: LOCAL_DB_PATH }
);

export async function dbGet<T = unknown>(sql: string, args: unknown[] = []): Promise<T | undefined> {
  const result = await db.execute({ sql, args: args as never[] });
  return result.rows[0] as T | undefined;
}

export async function dbAll<T = unknown>(sql: string, args: unknown[] = []): Promise<T[]> {
  const result = await db.execute({ sql, args: args as never[] });
  return result.rows as T[];
}

export async function dbRun(sql: string, args: unknown[] = []): Promise<void> {
  await db.execute({ sql, args: args as never[] });
}