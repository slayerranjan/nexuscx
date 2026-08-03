import { db } from "./client";

/**
 * NexusCX schema
 * --------------
 * organizations     – one tenant per subscribing company
 * agents            – support staff / admin logins
 * customers         – real customer identities, auto-linked across conversations
 * knowledge_articles – source docs the AI answers from
 * article_chunks    – paragraph-level chunks used for retrieval (local lexical search)
 * conversations     – one thread per visitor session, any channel
 * messages          – every message in a conversation (visitor / ai / agent)
 */
export async function runMigrations() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','agent')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT,
      phone TEXT,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS knowledge_articles (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS article_chunks (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
      channel TEXT NOT NULL DEFAULT 'website' CHECK (channel IN ('website','whatsapp','voice')),
      visitor_name TEXT,
      visitor_email TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
      resolution TEXT NOT NULL DEFAULT 'pending' CHECK (resolution IN ('pending','ai_resolved','escalated','agent_resolved')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      issue_category TEXT,
      assigned_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      topic_tag TEXT,
      sentiment TEXT CHECK (sentiment IN ('positive','neutral','negative')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS case_notes (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      agent_name TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK (sender IN ('visitor','ai','agent')),
      content TEXT NOT NULL,
      agent_name TEXT,
      escalation_flag INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_articles_org ON knowledge_articles(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_chunks_article ON article_chunks(article_id)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_case_notes_conversation ON case_notes(conversation_id)`,
  ];

  for (const sql of statements) {
    try {
      await db.execute(sql);
    } catch (err) {
      console.error("FAILED STATEMENT:\n", sql);
      console.error("ERROR:", err);
      throw err;
    }
  }

  try {
    await db.execute(`ALTER TABLE conversations ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';`);
  } catch {
    // already exists — safe to ignore
  }
}

try {
    await db.execute(`ALTER TABLE conversations ADD COLUMN issue_category TEXT;`);
  } catch {
    // already exists — safe to ignore
  }

// Runs automatically the moment this file is first imported anywhere in the
// app (every page and API route imports it indirectly via queries.ts), so
// new columns/tables get applied to the live database on startup — no more
// manually running the destructive seed script just to pick up a schema change.
runMigrations().catch((err) => {
  console.error("Automatic schema migration failed:", err);
});