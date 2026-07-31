import { retrieveRelevantChunks } from "./retrieval";
import type { Message } from "@/lib/db/queries";

export async function suggestAgentReply(
  organizationId: string,
  messages: Message[]
): Promise<string | null> {
  const lastVisitorMessage = [...messages].reverse().find((m) => m.sender === "visitor");
  if (!lastVisitorMessage) return null;

  const relevant = await retrieveRelevantChunks(organizationId, lastVisitorMessage.content, 3);
  const context = relevant.map((c) => c.chunk_text);

  const history = messages
    .slice(-6)
    .map((m) => `${m.sender.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `You are helping a human support agent draft a reply to a customer. Here is the recent conversation:

${history}

Relevant knowledge base context:
${context.length > 0 ? context.map((c, i) => `[${i + 1}] ${c}`).join("\n\n") : "(none found)"}

Write a short, empathetic, specific draft reply the agent could send or edit. Do not sign off with a name. Keep it under 60 words.`;

  if (!process.env.GROQ_API_KEY) return null;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}