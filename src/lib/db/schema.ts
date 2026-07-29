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
export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','agent')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name TEXT,
      email TEXT,
      phone TEXT,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS knowledge_articles (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS article_chunks (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES knowledge_articles(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      chunk_text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      channel TEXT NOT NULL DEFAULT 'website' CHECK (channel IN ('website','whatsapp','voice')),
      visitor_name TEXT,
      visitor_email TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
      resolution TEXT NOT NULL DEFAULT 'pending' CHECK (resolution IN ('pending','ai_resolved','escalated','agent_resolved')),
      assigned_agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      topic_tag TEXT,
      sentiment TEXT CHECK (sentiment IN ('positive','neutral','negative')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender TEXT NOT NULL CHECK (sender IN ('visitor','ai','agent')),
      content TEXT NOT NULL,
      agent_name TEXT,
      escalation_flag INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_org ON knowledge_articles(organization_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_article ON article_chunks(article_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  `);
}

runMigrations();

// One-time column additions for databases created before these existed.
// These run AFTER runMigrations(), and each is wrapped separately so one
// already-applied change never blocks the next one from running.
try {
  db.exec(`ALTER TABLE messages ADD COLUMN agent_name TEXT;`);
} catch {
  // already exists — safe to ignore
}
try {
  db.exec(`ALTER TABLE conversations ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;`);
} catch {
  // already exists — safe to ignore
}
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);`);
} catch {
  // already exists — safe to ignore
}