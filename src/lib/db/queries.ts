import "./schema";
import { db } from "./client";
import { randomUUID } from "node:crypto";

export const id = () => randomUUID();

export type Role = "admin" | "agent";
export type Channel = "website" | "whatsapp" | "voice";
export type Resolution = "pending" | "ai_resolved" | "escalated" | "agent_resolved";
export type Sender = "visitor" | "ai" | "agent";

export interface AgentRecord {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
}

export interface KnowledgeArticle {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  category: string;
  updated_at: string;
}

export interface ArticleChunk {
  id: string;
  article_id: string;
  chunk_index: number;
  chunk_text: string;
}

export interface Conversation {
  id: string;
  organization_id: string;
  channel: Channel;
  visitor_name: string | null;
  visitor_email: string | null;
  status: "open" | "closed";
  resolution: Resolution;
  assigned_agent_id: string | null;
  topic_tag: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: Sender;
  content: string;
  agent_name: string | null;
  escalation_flag: number;
  created_at: string;
}

// ---------- agents ----------
export function getAgentByEmail(email: string): AgentRecord | undefined {
  return db.prepare(`SELECT * FROM agents WHERE email = ?`).get(email) as unknown as AgentRecord | undefined;
}
export function getAgentById(agentId: string): AgentRecord | undefined {
  return db.prepare(`SELECT * FROM agents WHERE id = ?`).get(agentId) as unknown as AgentRecord | undefined;
}
export function listAgents(organizationId: string): AgentRecord[] {
  return db.prepare(`SELECT * FROM agents WHERE organization_id = ? ORDER BY name`).all(organizationId) as unknown as AgentRecord[];
}

// ---------- knowledge base ----------
export function listArticles(organizationId: string): KnowledgeArticle[] {
  return db
    .prepare(`SELECT * FROM knowledge_articles WHERE organization_id = ? ORDER BY category, title`)
    .all(organizationId) as unknown as KnowledgeArticle[];
}
export function getArticle(articleId: string): KnowledgeArticle | undefined {
  return db.prepare(`SELECT * FROM knowledge_articles WHERE id = ?`).get(articleId) as unknown as KnowledgeArticle | undefined;
}
export function listAllChunks(organizationId: string): (ArticleChunk & { article_title: string })[] {
  return db
    .prepare(
      `SELECT c.*, a.title as article_title FROM article_chunks c
       JOIN knowledge_articles a ON a.id = c.article_id
       WHERE a.organization_id = ?`
    )
    .all(organizationId) as unknown as (ArticleChunk & { article_title: string })[];
}

export function createArticle(input: {
  organizationId: string;
  title: string;
  content: string;
  category: string;
}): KnowledgeArticle {
  const articleId = id();
  db.prepare(
    `INSERT INTO knowledge_articles (id, organization_id, title, content, category) VALUES (?, ?, ?, ?, ?)`
  ).run(articleId, input.organizationId, input.title, input.content, input.category);
  indexArticle(articleId, input.content);
  return getArticle(articleId)!;
}

export function indexArticle(articleId: string, content: string): void {
  db.prepare(`DELETE FROM article_chunks WHERE article_id = ?`).run(articleId);
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const insert = db.prepare(
    `INSERT INTO article_chunks (id, article_id, chunk_index, chunk_text) VALUES (?, ?, ?, ?)`
  );
  paragraphs.forEach((p, idx) => insert.run(id(), articleId, idx, p));
}

// ---------- conversations ----------
export function createConversation(input: {
  organizationId: string;
  channel?: Channel;
  visitorName?: string;
  visitorEmail?: string;
  customerId?: string;
}): Conversation {
  const convId = id();
  db.prepare(
    `INSERT INTO conversations (id, organization_id, channel, visitor_name, visitor_email, customer_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    convId,
    input.organizationId,
    input.channel ?? "website",
    input.visitorName ?? null,
    input.visitorEmail ?? null,
    input.customerId ?? null
  );
  return getConversation(convId)!;
}


export function getConversation(conversationId: string): Conversation | undefined {
  return db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(conversationId) as unknown as Conversation | undefined;
}

export function listConversations(organizationId: string): Conversation[] {
  return db
    .prepare(`SELECT * FROM conversations WHERE organization_id = ? ORDER BY updated_at DESC`)
    .all(organizationId) as unknown as Conversation[];
}

export function updateConversationResolution(
  conversationId: string,
  resolution: Resolution,
  extra?: { topicTag?: string; sentiment?: "positive" | "neutral" | "negative" }
): void {
  db.prepare(
    `UPDATE conversations SET resolution = ?, topic_tag = COALESCE(?, topic_tag), sentiment = COALESCE(?, sentiment), updated_at = datetime('now') WHERE id = ?`
  ).run(resolution, extra?.topicTag ?? null, extra?.sentiment ?? null, conversationId);
}

export function assignAgent(conversationId: string, agentId: string): void {
  db.prepare(`UPDATE conversations SET assigned_agent_id = ?, updated_at = datetime('now') WHERE id = ?`).run(
    agentId,
    conversationId
  );
}

export function closeConversation(conversationId: string): void {
  db.prepare(`UPDATE conversations SET status = 'closed', updated_at = datetime('now') WHERE id = ?`).run(
    conversationId
  );
}

// ---------- messages ----------
export function listMessages(conversationId: string): Message[] {
  return db
    .prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`)
    .all(conversationId) as unknown as Message[];
}

export function addMessage(input: {
  conversationId: string;
  sender: Sender;
  content: string;
  agentName?: string;
  escalationFlag?: boolean;
}): Message {
  const msgId = id();
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender, content, agent_name, escalation_flag) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(msgId, input.conversationId, input.sender, input.content, input.agentName ?? null, input.escalationFlag ? 1 : 0);
  db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(input.conversationId);
  return db.prepare(`SELECT * FROM messages WHERE id = ?`).get(msgId) as unknown as Message;
}

// ---------- org-wide stats ----------
export function getOrgStats(organizationId: string) {
  const conversations = listConversations(organizationId);
  const total = conversations.length;
  const aiResolved = conversations.filter((c) => c.resolution === "ai_resolved").length;
  const escalated = conversations.filter((c) => c.resolution === "escalated").length;
  const agentResolved = conversations.filter((c) => c.resolution === "agent_resolved").length;
  const pending = conversations.filter((c) => c.resolution === "pending" && c.status === "open").length;

  const resolutionRate = total === 0 ? 0 : Math.round(((aiResolved) / total) * 100);

  const topicCounts: Record<string, number> = {};
  for (const c of conversations) {
    if (c.topic_tag) topicCounts[c.topic_tag] = (topicCounts[c.topic_tag] ?? 0) + 1;
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { total, aiResolved, escalated, agentResolved, pending, resolutionRate, topTopics };
}

export function getOrganization(organizationId: string): { id: string; name: string } | undefined {
  return db.prepare(`SELECT id, name FROM organizations WHERE id = ?`).get(organizationId) as unknown as
    | { id: string; name: string }
    | undefined;
}

export function listAgentsWithLoad(organizationId: string): (AgentRecord & { openCases: number })[] {
  const agents = listAgents(organizationId);
  return agents.map((a) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) as c FROM conversations WHERE assigned_agent_id = ? AND status = 'open'`
      )
      .get(a.id) as unknown as { c: number };
    return { ...a, openCases: row.c };
  });
}

// ---------- knowledge gap detection ----------
export interface KnowledgeGap {
  topic: string;
  count: number;
  sampleQuestion: string;
  conversationIds: string[];
}

export function detectKnowledgeGaps(organizationId: string, minOccurrences = 2): KnowledgeGap[] {
  const conversations = db
    .prepare(
      `SELECT id, topic_tag FROM conversations
       WHERE organization_id = ? AND resolution = 'escalated' AND topic_tag IS NOT NULL
       ORDER BY created_at ASC`
    )
    .all(organizationId) as unknown as { id: string; topic_tag: string }[];

  const grouped = new Map<string, { conversationIds: string[]; sampleQuestion: string }>();

  for (const conv of conversations) {
    const firstVisitorMessage = db
      .prepare(
        `SELECT content FROM messages WHERE conversation_id = ? AND sender = 'visitor' ORDER BY created_at ASC LIMIT 1`
      )
      .get(conv.id) as unknown as { content: string } | undefined;

    const key = conv.topic_tag;
    if (!grouped.has(key)) {
      grouped.set(key, { conversationIds: [], sampleQuestion: firstVisitorMessage?.content ?? "" });
    }
    grouped.get(key)!.conversationIds.push(conv.id);
  }

  return Array.from(grouped.entries())
    .map(([topic, data]) => ({
      topic,
      count: data.conversationIds.length,
      sampleQuestion: data.sampleQuestion,
      conversationIds: data.conversationIds,
    }))
    .filter((g) => g.count >= minOccurrences)
    .sort((a, b) => b.count - a.count);
}

// ---------- customers ----------
export interface Customer {
  id: string;
  organization_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  first_seen_at: string;
}

export function findOrCreateCustomer(input: {
  organizationId: string;
  name?: string;
  email?: string;
  phone?: string;
}): Customer {
  if (input.email) {
    const existing = db
      .prepare(`SELECT * FROM customers WHERE organization_id = ? AND email = ?`)
      .get(input.organizationId, input.email) as unknown as Customer | undefined;
    if (existing) return existing;
  }
  if (input.phone) {
    const existing = db
      .prepare(`SELECT * FROM customers WHERE organization_id = ? AND phone = ?`)
      .get(input.organizationId, input.phone) as unknown as Customer | undefined;
    if (existing) return existing;
  }

  const customerId = id();
  db.prepare(
    `INSERT INTO customers (id, organization_id, name, email, phone) VALUES (?, ?, ?, ?, ?)`
  ).run(customerId, input.organizationId, input.name ?? null, input.email ?? null, input.phone ?? null);

  return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId) as unknown as Customer;
}

export function listCustomers(organizationId: string): (Customer & { conversationCount: number })[] {
  return db
    .prepare(
      `SELECT c.*, COUNT(conv.id) as conversationCount
       FROM customers c
       LEFT JOIN conversations conv ON conv.customer_id = c.id
       WHERE c.organization_id = ?
       GROUP BY c.id
       ORDER BY c.first_seen_at DESC`
    )
    .all(organizationId) as unknown as (Customer & { conversationCount: number })[];
}

export function getCustomer(customerId: string): Customer | undefined {
  return db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customerId) as unknown as Customer | undefined;
}

export function getCustomerConversations(customerId: string): Conversation[] {
  return db
    .prepare(`SELECT * FROM conversations WHERE customer_id = ? ORDER BY created_at DESC`)
    .all(customerId) as unknown as Conversation[];
}