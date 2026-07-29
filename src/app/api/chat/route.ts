import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import "@/lib/db/schema";
import {
  createConversation,
  addMessage,
  listMessages,
  updateConversationResolution,
  findOrCreateCustomer,
} from "@/lib/db/queries";
import { generateChatReply } from "@/lib/ai/chatEngine";

function getDemoOrgId(): string {
  const row = db.prepare(`SELECT id FROM organizations LIMIT 1`).get() as { id: string } | undefined;
  if (!row) throw new Error("No organization found — run `npm run seed` first.");
  return row.id;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, message, visitorName } = body as {
    conversationId?: string;
    message: string;
    visitorName?: string;
  };

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const organizationId = getDemoOrgId();

  let conversation: { id: string };
  if (conversationId) {
    conversation = { id: conversationId };
  } else {
    const customer = findOrCreateCustomer({ organizationId, name: visitorName });
    conversation = createConversation({ organizationId, visitorName, customerId: customer.id });
  }

  addMessage({ conversationId: conversation.id, sender: "visitor", content: message.trim() });

  const history = listMessages(conversation.id);
  const result = await generateChatReply(organizationId, message.trim(), history);

  addMessage({
    conversationId: conversation.id,
    sender: "ai",
    content: result.reply,
    escalationFlag: result.escalate,
  });

  updateConversationResolution(conversation.id, result.escalate ? "escalated" : "ai_resolved", {
    topicTag: result.topic ?? undefined,
  });

  return NextResponse.json({
    conversationId: conversation.id,
    reply: result.reply,
    escalate: result.escalate,
  });
}