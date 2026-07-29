export async function draftKnowledgeArticle(topic: string, sampleQuestion: string): Promise<{ title: string; content: string }> {
  const prompt = `You are writing a customer support knowledge base article. A customer asked: "${sampleQuestion}" — and this topic ("${topic}") has repeatedly required a human agent because there's no article covering it yet.

Write a clear, professional knowledge base article that answers this. Since you don't have the company's actual policy details, write it as a clean TEMPLATE with realistic placeholder specifics in [brackets] (e.g. "[X business days]", "[refund policy detail]") that a human can quickly fill in and confirm — but the structure, tone, and completeness should be genuinely ready to use.

Respond in exactly this format, nothing else:
TITLE: <short article title>
CONTENT: <the article body, 2-4 short paragraphs>`;

  const text = await callAnyProvider(prompt);
  if (!text) {
    return {
      title: topic,
      content: `[AI draft unavailable — no provider reachable. Write the answer to: "${sampleQuestion}"]`,
    };
  }

  const titleMatch = text.match(/TITLE:\s*(.+)/i);
  const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/i);

  return {
    title: titleMatch?.[1]?.trim() ?? topic,
    content: contentMatch?.[1]?.trim() ?? text,
  };
}

async function callAnyProvider(prompt: string): Promise<string | null> {
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() ?? null;
      }
    } catch {
      // fall through
    }
  }
  return null;
}