import "./schema";
import { dbGet, dbAll, dbRun } from "./client";
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
  is_super_admin: number;
  channels: string;
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
  customer_id: string | null;
  channel: Channel;
  visitor_name: string | null;
  visitor_email: string | null;
  status: "open" | "closed";
  resolution: Resolution;
  priority: "low" | "medium" | "high";
  assigned_agent_id: string | null;
  topic_tag: string | null;
  issue_category: string | null;
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
export async function getAgentByEmail(email: string): Promise<AgentRecord | undefined> {
  return dbGet<AgentRecord>(`SELECT * FROM agents WHERE email = ?`, [email]);
}
export async function getAgentById(agentId: string): Promise<AgentRecord | undefined> {
  return dbGet<AgentRecord>(`SELECT * FROM agents WHERE id = ?`, [agentId]);
}
export async function listAgents(organizationId: string): Promise<AgentRecord[]> {
  return dbAll<AgentRecord>(`SELECT * FROM agents WHERE organization_id = ? ORDER BY name`, [organizationId]);
}

// ---------- knowledge base ----------
export async function listArticles(organizationId: string): Promise<KnowledgeArticle[]> {
  return dbAll<KnowledgeArticle>(
    `SELECT * FROM knowledge_articles WHERE organization_id = ? ORDER BY category, title`,
    [organizationId]
  );
}
export async function getArticle(articleId: string): Promise<KnowledgeArticle | undefined> {
  return dbGet<KnowledgeArticle>(`SELECT * FROM knowledge_articles WHERE id = ?`, [articleId]);
}
export async function listAllChunks(organizationId: string): Promise<(ArticleChunk & { article_title: string })[]> {
  return dbAll<ArticleChunk & { article_title: string }>(
    `SELECT c.*, a.title as article_title FROM article_chunks c
     JOIN knowledge_articles a ON a.id = c.article_id
     WHERE a.organization_id = ?`,
    [organizationId]
  );
}

export async function createArticle(input: {
  organizationId: string;
  title: string;
  content: string;
  category: string;
}): Promise<KnowledgeArticle> {
  const articleId = id();
  await dbRun(
    `INSERT INTO knowledge_articles (id, organization_id, title, content, category) VALUES (?, ?, ?, ?, ?)`,
    [articleId, input.organizationId, input.title, input.content, input.category]
  );
  await indexArticle(articleId, input.content);
  return (await getArticle(articleId))!;
}

export async function indexArticle(articleId: string, content: string): Promise<void> {
  await dbRun(`DELETE FROM article_chunks WHERE article_id = ?`, [articleId]);
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  for (let idx = 0; idx < paragraphs.length; idx++) {
    await dbRun(
      `INSERT INTO article_chunks (id, article_id, chunk_index, chunk_text) VALUES (?, ?, ?, ?)`,
      [id(), articleId, idx, paragraphs[idx]]
    );
  }
}

// ---------- conversations ----------
export async function createConversation(input: {
  organizationId: string;
  channel?: Channel;
  visitorName?: string;
  visitorEmail?: string;
  customerId?: string;
}): Promise<Conversation> {
  const convId = id();
  await dbRun(
    `INSERT INTO conversations (id, organization_id, channel, visitor_name, visitor_email, customer_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      convId,
      input.organizationId,
      input.channel ?? "website",
      input.visitorName ?? null,
      input.visitorEmail ?? null,
      input.customerId ?? null,
    ]
  );
  return (await getConversation(convId))!;
}

export async function getConversation(conversationId: string): Promise<Conversation | undefined> {
  return dbGet<Conversation>(`SELECT * FROM conversations WHERE id = ?`, [conversationId]);
}

export async function listConversations(organizationId: string): Promise<Conversation[]> {
  return dbAll<Conversation>(
    `SELECT * FROM conversations WHERE organization_id = ? ORDER BY updated_at DESC`,
    [organizationId]
  );
}

export async function updateConversationResolution(
  conversationId: string,
  resolution: Resolution,
  extra?: { topicTag?: string; sentiment?: "positive" | "neutral" | "negative"; priority?: "low" | "medium" | "high" }
): Promise<void> {
  await dbRun(
    `UPDATE conversations SET resolution = ?, topic_tag = COALESCE(?, topic_tag), sentiment = COALESCE(?, sentiment), priority = COALESCE(?, priority), updated_at = datetime('now') WHERE id = ?`,
    [resolution, extra?.topicTag ?? null, extra?.sentiment ?? null, extra?.priority ?? null, conversationId]
  );
}

export async function setPriority(conversationId: string, priority: "low" | "medium" | "high"): Promise<void> {
  await dbRun(`UPDATE conversations SET priority = ?, updated_at = datetime('now') WHERE id = ?`, [priority, conversationId]);
}

export async function assignAgent(conversationId: string, agentId: string): Promise<void> {
  await dbRun(
    `UPDATE conversations SET assigned_agent_id = ?, updated_at = datetime('now') WHERE id = ?`,
    [agentId, conversationId]
  );
}

export async function closeConversation(conversationId: string): Promise<void> {
  await dbRun(`UPDATE conversations SET status = 'closed', updated_at = datetime('now') WHERE id = ?`, [conversationId]);
}

// ---------- messages ----------
export async function listMessages(conversationId: string): Promise<Message[]> {
  return dbAll<Message>(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`, [conversationId]);
}

export async function addMessage(input: {
  conversationId: string;
  sender: Sender;
  content: string;
  agentName?: string;
  escalationFlag?: boolean;
}): Promise<Message> {
  const msgId = id();
  await dbRun(
    `INSERT INTO messages (id, conversation_id, sender, content, agent_name, escalation_flag) VALUES (?, ?, ?, ?, ?, ?)`,
    [msgId, input.conversationId, input.sender, input.content, input.agentName ?? null, input.escalationFlag ? 1 : 0]
  );
  await dbRun(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`, [input.conversationId]);
  return (await dbGet<Message>(`SELECT * FROM messages WHERE id = ?`, [msgId]))!;
}

// ---------- org-wide stats ----------
export async function getOrgStats(organizationId: string) {
  const conversations = await listConversations(organizationId);
  const total = conversations.length;
  const aiResolved = conversations.filter((c) => c.resolution === "ai_resolved").length;
  const escalated = conversations.filter((c) => c.resolution === "escalated" && c.status === "open").length;
  const agentResolved = conversations.filter((c) => c.resolution === "agent_resolved" || (c.resolution === "escalated" && c.status === "closed")).length;
  const pending = conversations.filter((c) => c.resolution === "pending" && c.status === "open").length;

  const resolutionRate = total === 0 ? 0 : Math.round((aiResolved / total) * 100);

  const topicCounts: Record<string, number> = {};
  for (const c of conversations) {
    if (c.topic_tag) topicCounts[c.topic_tag] = (topicCounts[c.topic_tag] ?? 0) + 1;
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return { total, aiResolved, escalated, agentResolved, pending, resolutionRate, topTopics };
}


export async function getCompanyHealthSnapshot(organizationId: string) {
  const stats = await getOrgStats(organizationId);
  return { total: stats.total, resolutionRate: stats.resolutionRate, pending: stats.pending };
}

export async function getOrganization(organizationId: string): Promise<{ id: string; name: string } | undefined> {
  return dbGet<{ id: string; name: string }>(`SELECT id, name FROM organizations WHERE id = ?`, [organizationId]);
}

export async function listAgentsWithLoad(
  organizationId: string,
  channel?: string
): Promise<(AgentRecord & { openCases: number })[]> {
  const agents = await listAgents(organizationId);
  const result = [];
  for (const a of agents) {
    if (channel && !(await canAgentHandle(a.id, channel))) continue;
    const row = await dbGet<{ c: number }>(
      `SELECT COUNT(*) as c FROM conversations WHERE assigned_agent_id = ? AND status = 'open'`,
      [a.id]
    );
    result.push({ ...a, openCases: row?.c ?? 0 });
  }
  return result;
}

// ---------- knowledge gap detection ----------
export interface KnowledgeGap {
  topic: string;
  count: number;
  sampleQuestion: string;
  conversationIds: string[];
}

export async function detectKnowledgeGaps(organizationId: string, minOccurrences = 2): Promise<KnowledgeGap[]> {
  const conversations = await dbAll<{ id: string; topic_tag: string }>(
    `SELECT id, topic_tag FROM conversations
     WHERE organization_id = ? AND resolution = 'escalated' AND topic_tag IS NOT NULL
     ORDER BY created_at ASC`,
    [organizationId]
  );

  const grouped = new Map<string, { conversationIds: string[]; sampleQuestion: string }>();

  for (const conv of conversations) {
    const firstVisitorMessage = await dbGet<{ content: string }>(
      `SELECT content FROM messages WHERE conversation_id = ? AND sender = 'visitor' ORDER BY created_at ASC LIMIT 1`,
      [conv.id]
    );

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

export async function findOrCreateCustomer(input: {
  organizationId: string;
  name?: string;
  email?: string;
  phone?: string;
}): Promise<Customer> {
  if (input.email) {
    const existing = await dbGet<Customer>(
      `SELECT * FROM customers WHERE organization_id = ? AND LOWER(email) = LOWER(?)`,
      [input.organizationId, input.email]
    );
    if (existing) return existing;
  }
  if (input.phone) {
    const existing = await dbGet<Customer>(
      `SELECT * FROM customers WHERE organization_id = ? AND phone = ?`,
      [input.organizationId, input.phone]
    );
    if (existing) return existing;
  }

  const customerId = id();
  await dbRun(
    `INSERT INTO customers (id, organization_id, name, email, phone) VALUES (?, ?, ?, ?, ?)`,
    [customerId, input.organizationId, input.name ?? null, input.email ?? null, input.phone ?? null]
  );

  return (await dbGet<Customer>(`SELECT * FROM customers WHERE id = ?`, [customerId]))!;
}

export async function listCustomers(organizationId: string): Promise<(Customer & { conversationCount: number })[]> {
  return dbAll<Customer & { conversationCount: number }>(
    `SELECT c.*, COUNT(conv.id) as conversationCount
     FROM customers c
     LEFT JOIN conversations conv ON conv.customer_id = c.id
     WHERE c.organization_id = ?
     GROUP BY c.id
     ORDER BY c.first_seen_at DESC`,
    [organizationId]
  );
}

export async function getCustomer(customerId: string): Promise<Customer | undefined> {
  return dbGet<Customer>(`SELECT * FROM customers WHERE id = ?`, [customerId]);
}

export async function getCustomerConversations(customerId: string): Promise<Conversation[]> {
  return dbAll<Conversation>(`SELECT * FROM conversations WHERE customer_id = ? ORDER BY created_at DESC`, [customerId]);
}

export async function getUnassignedEscalatedCount(organizationId: string): Promise<number> {
  const row = await dbGet<{ c: number }>(
    `SELECT COUNT(*) as c FROM conversations
     WHERE organization_id = ? AND status = 'open'
     AND (resolution = 'escalated' OR resolution = 'pending')
     AND assigned_agent_id IS NULL`,
    [organizationId]
  );
  return row?.c ?? 0;
}

export interface SlaStats {
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutesByPriority: Record<string, number | null>;
}

export async function getSlaStats(organizationId: string): Promise<SlaStats> {
  const conversations = await dbAll<{
    id: string;
    priority: string;
    created_at: string;
    updated_at: string;
    status: string;
    resolution: string;
  }>(
    `SELECT id, priority, created_at, updated_at, status, resolution FROM conversations WHERE organization_id = ?`,
    [organizationId]
  );

  const firstResponseTimes: number[] = [];
  for (const conv of conversations) {
    const firstReply = await dbGet<{ created_at: string }>(
      `SELECT created_at FROM messages WHERE conversation_id = ? AND sender IN ('ai','agent') ORDER BY created_at ASC LIMIT 1`,
      [conv.id]
    );
    if (firstReply) {
      const diffMinutes = (new Date(firstReply.created_at + "Z").getTime() - new Date(conv.created_at + "Z").getTime()) / 60000;
      if (diffMinutes >= 0) firstResponseTimes.push(diffMinutes);
    }
  }

  const avgFirstResponseMinutes =
    firstResponseTimes.length === 0
      ? null
      : Math.round(firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length);

  const byPriority: Record<string, number[]> = { high: [], medium: [], low: [] };
  for (const conv of conversations) {
    if (conv.status !== "closed" && conv.resolution !== "ai_resolved") continue;
    const diffMinutes = (new Date(conv.updated_at + "Z").getTime() - new Date(conv.created_at + "Z").getTime()) / 60000;
    if (diffMinutes >= 0 && byPriority[conv.priority]) {
      byPriority[conv.priority].push(diffMinutes);
    }
  }

  const avgResolutionMinutesByPriority: Record<string, number | null> = {};
  for (const [priority, times] of Object.entries(byPriority)) {
    avgResolutionMinutesByPriority[priority] =
      times.length === 0 ? null : Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  return { avgFirstResponseMinutes, avgResolutionMinutesByPriority };
}

export async function getAgentPersonalStats(organizationId: string, agentId: string) {
  const conversations = await dbAll<{
    id: string;
    resolution: string;
    priority: string;
    created_at: string;
    updated_at: string;
    status: string;
  }>(
    `SELECT id, resolution, priority, created_at, updated_at, status FROM conversations
     WHERE organization_id = ? AND assigned_agent_id = ?`,
    [organizationId, agentId]
  );

  const total = conversations.length;
  const resolved = conversations.filter((c) => c.resolution === "agent_resolved").length;
  const open = conversations.filter((c) => c.status === "open").length;

  const resolutionTimes: number[] = [];
  for (const conv of conversations) {
    if (conv.status !== "closed") continue;
    const diffMinutes = (new Date(conv.updated_at + "Z").getTime() - new Date(conv.created_at + "Z").getTime()) / 60000;
    if (diffMinutes >= 0) resolutionTimes.push(diffMinutes);
  }
  const avgResolutionMinutes =
    resolutionTimes.length === 0 ? null : Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length);

  return { total, resolved, open, avgResolutionMinutes };
}

export async function getTeamPerformance(organizationId: string) {
  const agents = await listAgents(organizationId);
  const results = [];
  for (const a of agents) {
    const stats = await getAgentPersonalStats(organizationId, a.id);
    results.push({ id: a.id, name: a.name, role: a.role, channels: a.channels, ...stats });
  }
  return results.sort((a, b) => b.resolved - a.resolved);
}

export async function getOtherCustomerConversations(
  customerId: string,
  excludeConversationId: string
): Promise<Conversation[]> {
  return dbAll<Conversation>(
    `SELECT * FROM conversations WHERE customer_id = ? AND id != ? ORDER BY created_at DESC LIMIT 5`,
    [customerId, excludeConversationId]
  );
}

// ---------- case notes ----------
export interface CaseNote {
  id: string;
  conversation_id: string;
  agent_name: string;
  note: string;
  created_at: string;
}

export async function listCaseNotes(conversationId: string): Promise<CaseNote[]> {
  return dbAll<CaseNote>(
    `SELECT * FROM case_notes WHERE conversation_id = ? ORDER BY created_at DESC`,
    [conversationId]
  );
}

export async function addCaseNote(input: {
  conversationId: string;
  agentName: string;
  note: string;
}): Promise<CaseNote> {
  const noteId = id();
  await dbRun(
    `INSERT INTO case_notes (id, conversation_id, agent_name, note) VALUES (?, ?, ?, ?)`,
    [noteId, input.conversationId, input.agentName, input.note]
  );
  return (await dbGet<CaseNote>(`SELECT * FROM case_notes WHERE id = ?`, [noteId]))!;
}

// ---------- editable customer contact info ----------
export async function updateCustomerContact(
  customerId: string,
  input: { name?: string; email?: string; phone?: string }
): Promise<void> {
  await dbRun(
    `UPDATE customers SET
      name = COALESCE(NULLIF(?, ''), name),
      email = COALESCE(NULLIF(?, ''), email),
      phone = COALESCE(NULLIF(?, ''), phone)
     WHERE id = ?`,
    [input.name ?? "", input.email ?? "", input.phone ?? "", customerId]
  );
}

// ---------- live typing indicator ----------
export async function setAgentTyping(conversationId: string): Promise<void> {
  // Flag expires 6 seconds from now — if the agent stops typing, this
  // naturally clears itself without needing a separate "stopped" signal.
  const expiresAt = new Date(Date.now() + 6000).toISOString();
  await dbRun(`UPDATE conversations SET agent_typing_until = ? WHERE id = ?`, [expiresAt, conversationId]);
}

export async function isAgentCurrentlyTyping(conversationId: string): Promise<boolean> {
  const row = await dbGet<{ agent_typing_until: string | null }>(
    `SELECT agent_typing_until FROM conversations WHERE id = ?`,
    [conversationId]
  );
  if (!row?.agent_typing_until) return false;
  return new Date(row.agent_typing_until).getTime() > Date.now();
}


// ---------- multi-tenant: organization creation ----------
export async function createOrganizationWithAdmin(input: {
  organizationName: string;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
}): Promise<{ organizationId: string; agentId: string }> {
  const orgId = id();
  await dbRun(`INSERT INTO organizations (id, name) VALUES (?, ?)`, [orgId, input.organizationName]);

  const agentId = id();
  await dbRun(
    `INSERT INTO agents (id, organization_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, 'admin')`,
    [agentId, orgId, input.adminName, input.adminEmail.toLowerCase().trim(), input.adminPasswordHash]
  );

  return { organizationId: orgId, agentId };
}

export async function listAllOrganizations(): Promise<{ id: string; name: string; created_at: string; agentCount: number }[]> {
  return dbAll(
    `SELECT o.id, o.name, o.created_at, COUNT(a.id) as agentCount
     FROM organizations o
     LEFT JOIN agents a ON a.organization_id = o.id
     GROUP BY o.id
     ORDER BY o.created_at DESC`
  );
}

export async function getClosedWithoutReplyIds(organizationId: string): Promise<Set<string>> {
  const rows = await dbAll<{ id: string }>(
    `SELECT c.id FROM conversations c
     WHERE c.organization_id = ? AND c.status = 'closed'
     AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.sender = 'agent')`,
    [organizationId]
  );
  return new Set(rows.map((r) => r.id));
}

export async function getOrgIdByEmbedKey(embedKey: string): Promise<string | null> {
  const row = await dbGet<{ id: string }>(`SELECT id FROM organizations WHERE embed_key = ?`, [embedKey]);
  return row?.id ?? null;
}

export async function getEnabledModules(organizationId: string): Promise<string[]> {
  const org = await dbGet<{ enabled_modules: string }>(
    `SELECT enabled_modules FROM organizations WHERE id = ?`,
    [organizationId]
  );
  return (org?.enabled_modules ?? "website").split(",").map((m) => m.trim());
}

export async function isModuleEnabled(organizationId: string, module: string): Promise<boolean> {
  const modules = await getEnabledModules(organizationId);
  return modules.includes(module);
} 



export async function getAgentChannels(agentId: string): Promise<string[]> {
  const agent = await dbGet<{ channels: string }>(
    `SELECT channels FROM agents WHERE id = ?`,
    [agentId]
  );
  return (agent?.channels ?? "website,whatsapp,voice").split(",").map((c) => c.trim());
}

export async function canAgentHandle(agentId: string, channel: string): Promise<boolean> {
  const channels = await getAgentChannels(agentId);
  return channels.includes(channel);
}

export async function updateAgentChannels(agentId: string, channels: string[]): Promise<void> {
  await dbRun(`UPDATE agents SET channels = ? WHERE id = ?`, [channels.join(","), agentId]);
}


export async function setDisposition(
  conversationId: string,
  disposition: "resolved" | "escalated" | "dropped" | "follow_up_requested"
): Promise<void> {
  await dbRun(`UPDATE conversations SET disposition = ?, updated_at = datetime('now') WHERE id = ?`, [
    disposition,
    conversationId,
  ]);
}