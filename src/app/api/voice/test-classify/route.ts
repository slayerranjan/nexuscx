import { NextRequest, NextResponse } from "next/server";
import { classifyTopic } from "@/lib/ai/chatEngine";

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text") ?? "my order arrived damaged";
  const topic = await classifyTopic(text);
  return NextResponse.json({ input: text, topic });
}