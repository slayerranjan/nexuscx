"use server";

import { revalidatePath } from "next/cache";
import {
  addMessage,
  closeConversation,
  updateConversationResolution,
  assignAgent,
  getConversation,
  listMessages,
  addCaseNote,
  updateCustomerContact,
} from "@/lib/db/queries";
import { getCurrentAgent } from "@/lib/auth";
import { suggestAgentReply } from "@/lib/ai/suggestReply";
import { db } from "@/lib/db/client";

function canAct(conversation: { assigned_agent_id: string | null }, agent: { id: string; role: string }) {
  if (agent.role === "admin") return true;
  return conversation.assigned_agent_id === agent.id;
}

export async function sendAgentReply(conversationId: string, content: string) {
  const agent = await getCurrentAgent();
  const conversation = await getConversation(conversationId);
  if (!agent || !conversation || !content.trim()) return;
  if (!canAct(conversation, agent)) return;

  if (!conversation.assigned_agent_id) {
    await assignAgent(conversationId, agent.id);
  }

  await addMessage({ conversationId, sender: "agent", content: content.trim(), agentName: agent.name });
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}

export async function claimCase(conversationId: string) {
  const agent = await getCurrentAgent();
  if (!agent) return;
  await assignAgent(conversationId, agent.id);
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}

export async function markClosed(conversationId: string) {
  const agent = await getCurrentAgent();
  const conversation = await getConversation(conversationId);
  if (!agent || !conversation || !canAct(conversation, agent)) return;
  await closeConversation(conversationId);
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}

export async function reopenCase(conversationId: string) {
  const agent = await getCurrentAgent();
  const conversation = await getConversation(conversationId);
  if (!agent || !conversation || !canAct(conversation, agent)) return;
  await db.execute({
    sql: `UPDATE conversations SET status = 'open', updated_at = datetime('now') WHERE id = ?`,
    args: [conversationId],
  });
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}

export async function getSuggestion(conversationId: string) {
  const agent = await getCurrentAgent();
  const conversation = await getConversation(conversationId);
  if (!agent || !conversation) return null;

  const messages = await listMessages(conversationId);
  return suggestAgentReply(agent.organization_id, messages);
}

export async function reassignCase(conversationId: string, newAgentId: string) {
  const agent = await getCurrentAgent();
  if (!agent || agent.role !== "admin") return;
  await assignAgent(conversationId, newAgentId);
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
}

export async function saveNote(conversationId: string, note: string) {
  const agent = await getCurrentAgent();
  if (!agent || !note.trim()) return;
  await addCaseNote({ conversationId, agentName: agent.name, note: note.trim() });
  revalidatePath(`/dashboard/conversations/${conversationId}`);
}

export async function updateContact(
  customerId: string,
  data: { name?: string; email?: string; phone?: string }
) {
  const agent = await getCurrentAgent();
  if (!agent) return;
  await updateCustomerContact(customerId, data);
  revalidatePath(`/dashboard/conversations`);
}