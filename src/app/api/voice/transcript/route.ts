import { NextRequest, NextResponse } from "next/server";
import { addMessage } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;

  if (message?.type !== "end-of-call-report") {
    return NextResponse.json({ ignored: true });
  }

  const conversationId = message?.call?.metadata?.conversationId;
  const transcript = message?.transcript;

  if (!conversationId || !transcript) {
    return NextResponse.json({ error: "Missing conversationId or transcript." }, { status: 400 });
  }

  await addMessage({
    conversationId,
    sender: "visitor",
    content: `Full call transcript:\n\n${transcript}`,
  });

  return NextResponse.json({ success: true });
}