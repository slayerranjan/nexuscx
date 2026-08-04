import { NextRequest, NextResponse } from "next/server";
import { listMessages, getConversation, getAgentById, isAgentCurrentlyTyping } from "@/lib/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
  }

  const messages = await listMessages(conversationId);
  const conversation = await getConversation(conversationId);

  let agentName: string | null = null;
  if (conversation?.assigned_agent_id) {
    const agent = await getAgentById(conversation.assigned_agent_id);
    agentName = agent?.name ?? null;
  }

  const agentTyping = await isAgentCurrentlyTyping(conversationId);

  return NextResponse.json({
    messages: messages.map((m) => ({
      sender: m.sender,
      content: m.content,
      escalated: !!m.escalation_flag,
    })),
    agentName,
    caseClosed: conversation?.status === "closed",
    agentTyping,
  });
}