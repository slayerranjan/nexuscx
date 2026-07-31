import { listAllChunks, type ArticleChunk } from "@/lib/db/queries";

type ScoredChunk = ArticleChunk & { article_title: string; score: number };

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been","to","of","and","or","in","on",
  "for","with","how","what","do","does","i","you","your","my","can","it","this","that",
  "will","how's","how do","please","hi","hello","thanks","thank",
]);

const RAW_SYNONYMS: Record<string, string> = {
  arrive: "deliver", arrives: "deliver", arrived: "deliver", arriving: "deliver",
  delivery: "deliver", delivered: "deliver", deliveries: "deliver",
  broken: "damaged", defective: "damaged", faulty: "damaged", shattered: "damaged",
  refund: "return", refunded: "return", refunds: "return", refunding: "return",
  cancelled: "cancel", cancellation: "cancel", canceling: "cancel",
  points: "reward", rewards: "reward", loyalty: "reward",
  shipping: "ship", shipped: "ship", ships: "ship",
  charged: "pay", charge: "pay", payment: "pay", billing: "pay", paid: "pay", pays: "pay",
  signin: "login", "log-in": "login", "sign-in": "login",
};

function stem(word: string): string {
  let w = word;
  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("es") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) w = w.slice(0, -1);
  if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
  return w;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => RAW_SYNONYMS[t] ?? t)
    .map(stem);
}

export async function retrieveRelevantChunks(
  organizationId: string,
  query: string,
  topK = 4
): Promise<ScoredChunk[]> {
  const chunks = await listAllChunks(organizationId);
  if (chunks.length === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const docs = chunks.map((c) => tokenize(c.chunk_text));
  const N = docs.length;
  const avgLen = docs.reduce((s: number, d: string[]) => s + d.length, 0) / N;

  const df: Record<string, number> = {};
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const term of seen) df[term] = (df[term] ?? 0) + 1;
  }

  const k1 = 1.5;
  const b = 0.75;

  const scored: ScoredChunk[] = chunks.map((chunk, i) => {
    const doc = docs[i];
    const docLen = doc.length || 1;
    let score = 0;
    for (const term of queryTerms) {
      const freq = doc.filter((t: string) => t === term).length;
      if (freq === 0) continue;
      const idf = Math.log(1 + (N - (df[term] ?? 0) + 0.5) / ((df[term] ?? 0) + 0.5));
      const denom = freq + k1 * (1 - b + (b * docLen) / avgLen);
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    return { ...chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, topK);
}