import { NextRequest, NextResponse } from "next/server";
import { listMessages } from "@/lib/db/queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
  }

  const messages = await listMessages(conversationId);

  return NextResponse.json({
    messages: messages.map((m) => ({
      sender: m.sender,
      content: m.content,
      escalated: !!m.escalation_flag,
    })),
  });
}