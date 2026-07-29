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

export default async function ConversationsPage() {
  const agent = await getCurrentAgent();
  const conversations = listConversations(agent!.organization_id);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Live queue</h1>
      <p className="text-ink-muted text-sm mb-6">
        Every conversation, tagged by how it was — or needs to be — resolved.
      </p>

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
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${style.className}`}>
                {style.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
