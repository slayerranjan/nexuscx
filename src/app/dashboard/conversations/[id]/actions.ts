"use server";

import { revalidatePath } from "next/cache";
import { addMessage, closeConversation, updateConversationResolution, assignAgent, getConversation, listMessages } from "@/lib/db/queries";
import { getCurrentAgent } from "@/lib/auth";
import { suggestAgentReply } from "@/lib/ai/suggestReply";

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