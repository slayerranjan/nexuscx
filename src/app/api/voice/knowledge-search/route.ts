import { NextRequest, NextResponse } from "next/server";
import { listAllChunks, getOrgIdByEmbedKey, isModuleEnabled } from "@/lib/db/queries";

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
    return NextResponse.json({ error: "Voice module is not enabled for this organization." }, { status: 403 });
  }

  const body = await req.json();
  const { query } = body as { query: string };

  if (!query) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  const chunks = await listAllChunks(organizationId);

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = chunks.map((c) => {
    const text = c.chunk_text.toLowerCase();
    const score = queryWords.filter((w) => text.includes(w)).length;
    return { ...c, score };
  });

  const matches = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (matches.length === 0) {
    return NextResponse.json({ found: false, answer: "No relevant information found in the knowledge base." });
  }

  const answer = matches.map((m) => `From "${m.article_title}": ${m.chunk_text}`).join("\n\n");

  return NextResponse.json({ found: true, answer });
}