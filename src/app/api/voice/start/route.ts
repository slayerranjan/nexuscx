import { NextRequest, NextResponse } from "next/server";
import { createConversation, findOrCreateCustomer, getOrgIdByEmbedKey, isModuleEnabled } from "@/lib/db/queries";
import { db } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const rawBody = await req.clone().json().catch(() => ({}));

  const embedKey = req.headers.get("x-embed-key");
  if (!embedKey) {
    return NextResponse.json({ error: "Missing embed key." }, { status: 403 });
  }

  const organizationId = await getOrgIdByEmbedKey(embedKey);
  if (!organizationId) {
    return NextResponse.json({ error: "Invalid embed key." }, { status: 403 });
  }

  const voiceEnabled = await isModuleEnabled(organizationId, "voice");
  if (!voiceEnabled) {
    return NextResponse.json({ error: "Voice module is not enabled for this organization." }, { status: 403 });
  }

  const customer = await findOrCreateCustomer({ organizationId });

  const conversation = await createConversation({
    organizationId,
    customerId: customer.id,
    channel: "voice",
  });

  await db.execute({
    sql: `UPDATE conversations SET debug_payload = ? WHERE id = ?`,
    args: [JSON.stringify(rawBody), conversation.id],
  });

  return NextResponse.json({ conversation_id: conversation.id });
}