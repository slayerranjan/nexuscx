import { getCurrentAgent } from "@/lib/auth";
import { listArticles } from "@/lib/db/queries";
import { NewArticleForm } from "./new-article-form";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ prefillTitle?: string; prefillQuestion?: string }>;
}) {
  const agent = await getCurrentAgent();
  const articles = listArticles(agent!.organization_id);
  const params = await searchParams;

  const byCategory = new Map<string, typeof articles>();
  for (const a of articles) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category)!.push(a);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Knowledge base</h1>
      <p className="text-ink-muted text-sm mb-6">
        The source the AI answers from. Add or update an article and it&apos;s searchable immediately.
      </p>

      <NewArticleForm
        prefillTitle={params.prefillTitle}
        prefillQuestion={params.prefillQuestion}
      />

      <div className="mt-8 space-y-6">
        {Array.from(byCategory.entries()).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-xs font-medium text-steel uppercase tracking-wide mb-2">{category}</h2>
            <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden">
              {items.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}