import { retrieveRelevantChunks } from "./retrieval";
import type { Message } from "@/lib/db/queries";

export interface ChatResult {
  reply: string;
  escalate: boolean;
  usedContext: string[];
  topic: string | null;
}

const ESCALATE_TAG = "[[ESCALATE]]";
const TOPIC_TAG_PATTERN = /\[\[TOPIC:\s*(.+?)\]\]/i;

export async function generateChatReply(
  organizationId: string,
  visitorMessage: string,
  history: Message[]
): Promise<ChatResult> {
  const relevant = retrieveRelevantChunks(organizationId, visitorMessage, 4);
  const usedContext = relevant.map((c) => c.chunk_text);
  const systemPrompt = buildSystemPrompt(usedContext);

  let text: string | null = null;

  if (process.env.GROQ_API_KEY) {
    text = await callGroq(systemPrompt, history, visitorMessage);
  }
  if (!text && process.env.ANTHROPIC_API_KEY) {
    text = await callAnthropic(systemPrompt, history, visitorMessage);
  }
  if (!text && process.env.GEMINI_API_KEY) {
    text = await callGemini(systemPrompt, history, visitorMessage);
  }
  if (!text) {
    return templateFallback(usedContext);
  }

  const escalate = text.includes(ESCALATE_TAG);
  const topicMatch = text.match(TOPIC_TAG_PATTERN);
  const topic = topicMatch ? topicMatch[1].trim() : null;
  const reply =
    text.replace(ESCALATE_TAG, "").replace(TOPIC_TAG_PATTERN, "").trim() ||
    templateFallback(usedContext).reply;

  return { reply, escalate, usedContext, topic };
}

async function callGroq(
  systemPrompt: string,
  history: Message[],
  visitorMessage: string
): Promise<string | null> {
  try {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.sender === "visitor" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: visitorMessage },
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      console.error("Groq API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch (err) {
    console.error("Failed to reach Groq API:", err);
    return null;
  }
}

async function callGemini(
  systemPrompt: string,
  history: Message[],
  visitorMessage: string
): Promise<string | null> {
  try {
    const contents = [
      ...history.slice(-8).map((m) => ({
        role: m.sender === "visitor" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: visitorMessage }] },
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY as string,
        },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 400 },
        }),
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("\n");
    return text?.trim() || null;
  } catch (err) {
    console.error("Failed to reach Gemini API:", err);
    return null;
  }
}

async function callAnthropic(
  systemPrompt: string,
  history: Message[],
  visitorMessage: string
): Promise<string | null> {
  try {
    const messages = [
      ...history.slice(-8).map((m) => ({
        role: (m.sender === "visitor" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: visitorMessage },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = (data.content ?? [])
      .map((block: { type: string; text?: string }) => (block.type === "text" ? block.text : ""))
      .filter(Boolean)
      .join("\n");
    return text?.trim() || null;
  } catch (err) {
    console.error("Failed to reach Anthropic API:", err);
    return null;
  }
}

function buildSystemPrompt(context: string[]): string {
  return `You are a customer support AI for a company using NexusCX. Answer the visitor's question using ONLY the knowledge base context below. Be concise, friendly, and specific.

Rules:
- If the context fully answers the question, answer it directly and confidently.
- If the context does NOT contain enough information to answer confidently, or the visitor explicitly asks to speak to a human/agent, or the message describes a complaint, a billing dispute, or something clearly requiring human judgment — end your response with the exact tag ${ESCALATE_TAG} on its own line. Still write a brief, honest reply first (e.g. "Let me connect you with someone who can help with that.").
- Never invent information not present in the context.
- Keep replies under 80 words unless the question genuinely requires more.
- Always end your response with a topic tag on its own line, in this exact format: [[TOPIC: <2-4 word category>]] — for example [[TOPIC: Order tracking]] or [[TOPIC: Billing dispute]]. Use a short, consistent category name a support team would recognize.

Knowledge base context:
${context.length > 0 ? context.map((c, i) => `[${i + 1}] ${c}`).join("\n\n") : "(no relevant articles found)"}`;
}

function templateFallback(context: string[]): ChatResult {
  if (context.length === 0) {
    return {
      reply: `[Template reply — no AI provider is currently reachable]\n\nI couldn't find anything in the knowledge base about that. Let me connect you with someone who can help.`,
      escalate: true,
      usedContext: context,
      topic: null,
    };
  }
  return {
    reply: `[Template reply — no AI provider is currently reachable]\n\nBased on our knowledge base: ${context[0].slice(0, 220)}${context[0].length > 220 ? "…" : ""}`,
    escalate: false,
    usedContext: context,
    topic: null,
  };
}