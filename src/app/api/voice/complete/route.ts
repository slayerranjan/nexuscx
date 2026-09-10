import { NextRequest, NextResponse } from "next/server";
import { addMessage, updateConversationResolution, getOrgIdByEmbedKey, isModuleEnabled } from "@/lib/db/queries";
import { classifyTopic } from "@/lib/ai/chatEngine";
export async function POST(req: NextRequest) {
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
    return NextResponse.json(
      { error: "Voice module is not enabled for this organization." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { conversation_id, issue_summary, urgency, resolved, troubleshooting_attempted } = body as {
    conversation_id: string;
    issue_summary: string;
    urgency: "high" | "medium" | "low";
    resolved: boolean;
    troubleshooting_attempted?: string;
  };

  if (!conversation_id || !issue_summary || !urgency || resolved === undefined) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  await addMessage({ conversationId: conversation_id, sender: "visitor", content: issue_summary });

  if (troubleshooting_attempted) {
    await addMessage({
      conversationId: conversation_id,
      sender: "ai",
      content: `Troubleshooting attempted during call: ${troubleshooting_attempted}`,
    });
  }
    const topic = await classifyTopic(issue_summary);

  let rawDebug = "not attempted";
  try {
    const testResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Say hello in one word." }],
        max_tokens: 20,
      }),
    });
    const testText = await testResponse.text();
    rawDebug = `Status: ${testResponse.status} | Body: ${testText.slice(0, 300)}`;
  } catch (err) {
    rawDebug = `Threw exception: ${err instanceof Error ? err.message : String(err)}`;
  }

  const { db } = await import("@/lib/db/client");
  await db.execute({
    sql: `UPDATE conversations SET debug_payload = ? WHERE id = ?`,
    args: [JSON.stringify({ issue_summary, topic, rawDebug }), conversation_id],
  });
  await updateConversationResolution(conversation_id, resolved ? "ai_resolved" : "escalated", { priority: urgency, topicTag: topic ?? undefined });
  return NextResponse.json({ success: true, conversationId: conversation_id });
}