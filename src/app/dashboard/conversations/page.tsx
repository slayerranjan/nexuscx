import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { listConversations } from "@/lib/db/queries";
import { formatDistanceToNow } from "date-fns";

const RESOLUTION_STYLE: Record<string, { label: string; className: string }> = {
  ai_resolved: { label: "AI resolved", className: "bg-success-soft text-success" },
  escalated: { label: "Escalated", className: "bg-warning-soft text-warning" },
  agent_resolved: { label: "Agent resolved", className: "bg-steel-soft text-navy-deep" },
  pending: { label: "Pending", className: "bg-line text-ink-muted" },
};

const PRIORITY_STYLE: Record<string, { label: string; className: string }> = {
  high: { label: "High", className: "bg-danger-soft text-danger" },
  medium: { label: "Medium", className: "bg-warning-soft text-warning" },
  low: { label: "Low", className: "bg-steel-soft text-navy-deep" },
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string }>;
}) {
  const agent = await getCurrentAgent();
  const allConversations = await listConversations(agent!.organization_id);
  const params = await searchParams;
  const priorityFilter = params.priority;

  const conversations = priorityFilter
    ? allConversations.filter((c) => c.priority === priorityFilter)
    : allConversations;

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-ink">Live queue</h1>
      </div>
      <p className="text-ink-muted text-sm mb-4">
        Every conversation, tagged by how it was — or needs to be — resolved.
      </p>

      <div className="flex gap-2 mb-5">
        <Link
          href="/dashboard/conversations"
          className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
            !priorityFilter ? "bg-navy text-white border-navy" : "border-line text-ink-muted"
          }`}
        >
          All
        </Link>
        {(["high", "medium", "low"] as const).map((p) => (
          <Link
            key={p}
            href={`/dashboard/conversations?priority=${p}`}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
              priorityFilter === p ? "bg-navy text-white border-navy" : "border-line text-ink-muted"
            }`}
          >
            {PRIORITY_STYLE[p].label}
          </Link>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden">
        {conversations.length === 0 && (
          <p className="p-5 text-sm text-ink-muted">
            No conversations yet — try the{" "}
            <Link href="/widget-demo" className="text-navy underline" target="_blank">
              widget demo
            </Link>
            .
          </p>
        )}
        {conversations.map((c) => {
          const style = RESOLUTION_STYLE[c.resolution];
          const pStyle = PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.medium;
          return (
            <Link
              key={c.id}
              href={`/dashboard/conversations/${c.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-canvas transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink font-medium">{c.visitor_name ?? "Website visitor"}</p>
                <p className="text-xs text-ink-muted">
                  {c.topic_tag ?? "Untagged"} · {c.channel} ·{" "}
                  {formatDistanceToNow(new Date(c.updated_at + "Z"), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pStyle.className}`}>
                  {pStyle.label}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.className}`}>
                  {style.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}