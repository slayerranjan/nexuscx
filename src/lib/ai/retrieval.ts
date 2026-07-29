import { listAllChunks, type ArticleChunk } from "@/lib/db/queries";

/**
 * Retrieval layer for the knowledge base.
 *
 * Production note: this uses a local BM25-style lexical scorer instead of
 * vector embeddings, because this sandbox can only reach api.anthropic.com —
 * embedding providers (Voyage, OpenAI) aren't on the allowed network list.
 * The retrieval function below is the single seam to swap: replace
 * `retrieveRelevantChunks` with a real vector-similarity lookup once this
 * is deployed somewhere with embeddings API access. Nothing else in the
 * app needs to change — callers just get chunks back either way.
 */

type ScoredChunk = ArticleChunk & { article_title: string; score: number };

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been","to","of","and","or","in","on",
  "for","with","how","what","do","does","i","you","your","my","can","it","this","that",
  "will","how's","how do","please","hi","hello","thanks","thank",
]);

// Raw-token synonym normalization, applied before stemming. Covers the
// support-domain synonym clusters that a lexical scorer would otherwise
// miss entirely (e.g. "broken" vs "damaged", "arrive" vs "delivered").
// A production deployment with embeddings-API access would replace this
// whole file's approach with real vector similarity, which handles
// synonyms natively — this is the pragmatic stand-in for that.
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

/**
 * BM25 scoring across all chunks for an organization.
 */
export function retrieveRelevantChunks(
  organizationId: string,
  query: string,
  topK = 4
): ScoredChunk[] {
  const chunks = listAllChunks(organizationId);
  if (chunks.length === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const docs = chunks.map((c) => tokenize(c.chunk_text));
  const N = docs.length;
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / N;

  // document frequency per term
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
      const freq = doc.filter((t) => t === term).length;
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
