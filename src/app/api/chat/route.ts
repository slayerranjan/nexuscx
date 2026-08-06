import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import "@/lib/db/schema";
import {
  createConversation,
  addMessage,
  listMessages,
  updateConversationResolution,
  findOrCreateCustomer,
  getConversation,
  getOrgIdByEmbedKey,
} from "@/lib/db/queries";
import { generateChatReply } from "@/lib/ai/chatEngine";

const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX = 15;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

async function getDemoOrgId(): Promise<string> {
  const result = await db.execute(`SELECT id FROM organizations LIMIT 1`);
  const row = result.rows[0] as unknown as { id: string } | undefined;
  if (!row) throw new Error("No organization found — run `npm run seed` first.");
  return row.id;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-embed-key",
    },
  });
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

  const rateLimitKey = conversationId ?? req.headers.get("x-forwarded-for") ?? "anonymous";
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: "You're sending messages a bit too fast. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const embedKey = req.headers.get("x-embed-key");
  let organizationId: string;

  if (embedKey) {
    const foundOrgId = await getOrgIdByEmbedKey(embedKey);
    if (!foundOrgId) {
      return NextResponse.json({ error: "Invalid embed key." }, { status: 403 });
    }
    organizationId = foundOrgId;
  } else {
    organizationId = await getDemoOrgId();
  }

  let conversation: { id: string };
  if (conversationId) {
    conversation = { id: conversationId };
    await db.execute({
      sql: `UPDATE conversations SET status = 'open', updated_at = datetime('now') WHERE id = ? AND status = 'closed'`,
      args: [conversationId],
    });
  } else {
    const customer = await findOrCreateCustomer({
      organizationId,
      name: visitorName,
      email: visitorEmail?.trim().toLowerCase(),
      phone: visitorPhone?.trim(),
    });
    conversation = await createConversation({
      organizationId,
      visitorName,
      visitorEmail,
      customerId: customer.id,
    });
  }

  await addMessage({ conversationId: conversation.id, sender: "visitor", content: message.trim() });

  const fullConversation = await getConversation(conversation.id);

  if (fullConversation?.assigned_agent_id) {
    return NextResponse.json(
      {
        conversationId: conversation.id,
        reply: "Thanks — your message has been sent to our support agent, who will respond shortly.",
        escalate: false,
        humanHandling: true,
      },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

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

  return NextResponse.json(
    {
      conversationId: conversation.id,
      reply: result.reply,
      escalate: result.escalate,
    },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}