import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("text") ?? "my order arrived damaged";

  let result: string;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Classify the following into a short 2-4 word topic category." },
          { role: "user", content: text },
        ],
        max_tokens: 20,
      }),
    });
    const bodyText = await response.text();
    result = `Status: ${response.status} | Body: ${bodyText}`;
  } catch (err) {
    result = `Exception thrown: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({ input: text, rawResult: result });
}