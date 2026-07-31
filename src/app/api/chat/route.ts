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

async function getDemoOrgId(): Promise<string> {
  const result = await db.execute(`SELECT id FROM organizations LIMIT 1`);
  const row = result.rows[0] as unknown as { id: string } | undefined;
  if (!row) throw new Error("No organization found — run `npm run seed` first.");
  return row.id;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, message, visitorName, visitorEmail, visitorPhone } = body as {
    conversationId?: string;
    message: string;
    visitorName?: string;
    visitorEmail?: string;
    visitorPhone?: string;
  };

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const organizationId = await getDemoOrgId();

  let conversation: { id: string };
  if (conversationId) {
    conversation = { id: conversationId };
  } else {
    const customer = await findOrCreateCustomer({
      organizationId,
      name: visitorName,
      email: visitorEmail,
      phone: visitorPhone,
    });
    conversation = await createConversation({
      organizationId,
      visitorName,
      visitorEmail,
      customerId: customer.id,
    });
  }

  await addMessage({ conversationId: conversation.id, sender: "visitor", content: message.trim() });

  const history = await listMessages(conversation.id);
  const result = await generateChatReply(organizationId, message.trim(), history);

  await addMessage({
    conversationId: conversation.id,
    sender: "ai",
    content: result.reply,
    escalationFlag: result.escalate,
  });

  await updateConversationResolution(conversation.id, result.escalate ? "escalated" : "ai_resolved", {
    topicTag: result.topic ?? undefined,
    priority: result.priority ?? undefined,
  });
  
  return NextResponse.json({
    conversationId: conversation.id,
    reply: result.reply,
    escalate: result.escalate,
  });
}