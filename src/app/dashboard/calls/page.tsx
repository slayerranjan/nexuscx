import { getCurrentAgent } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listConversations } from "@/lib/db/queries";
import Link from "next/link";
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

export default async function LiveCallConsolePage() {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");
  if (!agent.channels.includes("voice")) redirect("/dashboard");

  const allConversations = await listConversations(agent.organization_id);
  const voiceConversations = allConversations.filter((c) => c.channel === "voice").slice(0, 20);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Live call console</h1>
      <p className="text-ink-muted text-sm mb-6">Recent voice calls handled by AI and your team.</p>

      {voiceConversations.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-8 text-center">
          <p className="text-ink-muted text-sm">No voice calls yet. Once calls start coming in, they&apos;ll appear here.</p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-lg overflow-hidden divide-y divide-line">
          {voiceConversations.map((c) => {
            const rStyle = RESOLUTION_STYLE[c.resolution] ?? RESOLUTION_STYLE.pending;
            const pStyle = PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.medium;
            return (
              <Link
                key={c.id}
                href={`/dashboard/conversations/${c.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gold-soft/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    Case #{c.id.slice(0, 6)} - {c.topic_tag ?? "Untagged"}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {formatDistanceToNow(new Date(c.created_at + "Z"), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pStyle.className}`}>{pStyle.label}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${rStyle.className}`}>{rStyle.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}