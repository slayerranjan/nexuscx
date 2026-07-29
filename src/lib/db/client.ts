import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "nexuscx.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __nexuscx_db__: DatabaseSync | undefined;
}

function createConnection(): DatabaseSync {
  const database = new DatabaseSync(DB_PATH);
  database.exec("PRAGMA foreign_keys = ON;");
  return database;
}

export const db: DatabaseSync = globalThis.__nexuscx_db__ ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__nexuscx_db__ = db;
}
