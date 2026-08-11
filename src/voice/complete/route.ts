import { NextRequest, NextResponse } from "next/server";
import {
  createConversation,
  addMessage,
  findOrCreateCustomer,
  updateConversationResolution,
  getOrgIdByEmbedKey,
} from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  const embedKey = req.headers.get("x-embed-key");
  if (!embedKey) {
    return NextResponse.json({ error: "Missing embed key." }, { status: 403 });
  }

  const organizationId = await getOrgIdByEmbedKey(embedKey);
  if (!organizationId) {
    return NextResponse.json({ error: "Invalid embed key." }, { status: 403 });
  }

  const body = await req.json();
  const {
    issue_summary,
    urgency,
    resolved,
    troubleshooting_attempted,
    caller_name,
    caller_contact,
  } = body as {
    issue_summary: string;
    urgency: "high" | "medium" | "low";
    resolved: boolean;
    troubleshooting_attempted?: string;
    caller_name?: string;
    caller_contact?: string;
  };

  if (!issue_summary || !urgency || resolved === undefined) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const customer = await findOrCreateCustomer({
    organizationId,
    name: caller_name,
    phone: caller_contact,
  });

  const conversation = await createConversation({
    organizationId,
    visitorName: caller_name,
    customerId: customer.id,
    channel: "voice",
  });

  await addMessage({
    conversationId: conversation.id,
    sender: "visitor",
    content: issue_summary,
  });

  if (troubleshooting_attempted) {
    await addMessage({
      conversationId: conversation.id,
      sender: "ai",
      content: `Troubleshooting attempted during call: ${troubleshooting_attempted}`,
    });
  }

  await updateConversationResolution(
    conversation.id,
    resolved ? "ai_resolved" : "escalated",
    { priority: urgency }
  );

  return NextResponse.json({ success: true, conversationId: conversation.id });
}