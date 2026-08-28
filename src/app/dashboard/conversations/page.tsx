import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { listConversations, listAgents, listAgentsWithLoad } from "@/lib/db/queries";
import { formatDistanceToNow } from "date-fns";
import { AgentFilterSelect } from "./agent-filter-select";

const RESOLUTION_STYLE: Record<string, { label: string; className: string; icon: string }> = {
  ai_resolved: { label: "AI resolved", className: "bg-success-soft text-success", icon: "✓" },
  escalated: { label: "Escalated", className: "bg-warning-soft text-warning", icon: "!" },
  agent_resolved: { label: "Agent resolved", className: "bg-steel-soft text-navy-deep", icon: "✓" },
  pending: { label: "Pending", className: "bg-line text-ink-muted", icon: "…" },
};

const PRIORITY_STYLE: Record<string, { label: string; className: string; dot: string }> = {
  high: { label: "High", className: "bg-danger-soft text-danger", dot: "bg-danger" },
  medium: { label: "Medium", className: "bg-warning-soft text-warning", dot: "bg-warning" },
  low: { label: "Low", className: "bg-steel-soft text-navy-deep", dot: "bg-steel" },
};

const CHANNEL_LABEL: Record<string, string> = {
  website: "Chat",
  whatsapp: "WhatsApp",
  voice: "Voice",
};

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string; agent?: string; channel?: string }>;
}) {
  const currentAgent = await getCurrentAgent();
  const isAdmin = currentAgent!.role === "admin";
  const allConversations = await listConversations(currentAgent!.organization_id);
  const params = await searchParams;
    const priorityFilter = params.priority;
  const agentFilter = params.agent;
  let channelFilter = params.channel;

  if (!channelFilter && !isAdmin) {
    const myChannels = currentAgent!.channels.split(",").map((c) => c.trim());
    if (myChannels.length === 1) {
      channelFilter = myChannels[0];
    }
  }

  const agentsList = isAdmin ? await listAgents(currentAgent!.organization_id) : [];

  let leastBusyByChannel: Record<string, string | undefined> = {};
  if (!isAdmin) {
    for (const ch of ["website", "whatsapp", "voice"]) {
      const withLoad = (await listAgentsWithLoad(currentAgent!.organization_id, ch)).sort((a, b) => a.openCases - b.openCases);
      leastBusyByChannel[ch] = withLoad[0]?.id;
    }
  }

  let conversations = allConversations;
  if (priorityFilter) {
    conversations = conversations.filter((c) => c.priority === priorityFilter);
  }
  if (channelFilter) {
    conversations = conversations.filter((c) => c.channel === channelFilter);
  }
  if (agentFilter === "me") {
    conversations = conversations.filter((c) => {
      const isMine = c.assigned_agent_id === currentAgent!.id;
      const isSuggestedUnclaimed =
        leastBusyByChannel[c.channel] === currentAgent!.id && !c.assigned_agent_id && c.status === "open" && (c.resolution === "escalated" || c.resolution === "pending");
      return isMine || isSuggestedUnclaimed;
    });
  } else if (agentFilter && isAdmin) {
    conversations = conversations.filter((c) => c.assigned_agent_id === agentFilter);
  }

  function buildUrl(priority?: string, agent?: string, channel?: string): string {
    const p = new URLSearchParams();
    if (priority) p.set("priority", priority);
    if (agent) p.set("agent", agent);
    if (channel) p.set("channel", channel);
    const q = p.toString();
    return `/dashboard/conversations${q ? `?${q}` : ""}`;
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-ink">Live queue</h1>
      </div>
      <p className="text-ink-muted text-sm mb-5">
        Every conversation, tagged by how it was — or needs to be — resolved.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Link
          href={buildUrl(priorityFilter, undefined, channelFilter)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            !agentFilter ? "bg-navy text-white border-navy" : "border-line text-ink-muted hover:border-steel"
          }`}
        >
          All cases
        </Link>
        {!isAdmin && (
          <Link
            href={buildUrl(priorityFilter, "me", channelFilter)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              agentFilter === "me" ? "bg-navy text-white border-navy" : "border-line text-ink-muted hover:border-steel"
            }`}
          >
            My cases
          </Link>
        )}

        {isAdmin && agentsList.length > 0 && (
          <AgentFilterSelect
            agents={agentsList.map((a) => ({ id: a.id, name: a.name }))}
            currentAgent={agentFilter && agentFilter !== "me" ? agentFilter : undefined}
            currentPriority={priorityFilter}
          />
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <Link
          href={buildUrl(undefined, agentFilter, channelFilter)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
            !priorityFilter ? "bg-navy text-white border-navy" : "border-line text-ink-muted hover:border-steel"
          }`}
        >
          All
        </Link>
        {(["high", "medium", "low"] as const).map((p) => (
          <Link
            key={p}
            href={buildUrl(p, agentFilter, channelFilter)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              priorityFilter === p ? "bg-navy text-white border-navy" : "border-line text-ink-muted hover:border-steel"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_STYLE[p].dot}`} />
            {PRIORITY_STYLE[p].label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 mb-5">
        <Link
          href={buildUrl(priorityFilter, agentFilter, undefined)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
            !channelFilter ? "bg-navy text-white border-navy" : "border-line text-ink-muted hover:border-steel"
          }`}
        >
          All channels
        </Link>
        {(["website", "whatsapp", "voice"] as const).map((ch) => (
          <Link
            key={ch}
            href={buildUrl(priorityFilter, agentFilter, ch)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
              channelFilter === ch ? "bg-navy text-white border-navy" : "border-line text-ink-muted hover:border-steel"
            }`}
          >
            {CHANNEL_LABEL[ch]}
          </Link>
        ))}
      </div>

      <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden shadow-sm">
        {conversations.length === 0 && (
          <p className="p-5 text-sm text-ink-muted">
            No conversations match this filter — try the{" "}
            <Link href="/widget-demo" className="text-navy underline" target="_blank">
              widget demo
            </Link>
            .
          </p>
        )}
        {conversations.map((c) => {
          const style = RESOLUTION_STYLE[c.resolution];
          const pStyle = PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.medium;
          const needsAttention = c.status === "open" && !c.assigned_agent_id && (c.resolution === "escalated" || c.resolution === "pending");
          return (
            <Link
              key={c.id}
              href={`/dashboard/conversations/${c.id}`}
              className={`flex items-center justify-between px-5 py-4 hover:bg-canvas transition-colors group ${
                needsAttention ? "pill-glow" : ""
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${pStyle.dot}`} />
                <div className="min-w-0">
                  <p className="text-sm text-ink font-medium group-hover:text-navy transition-colors">
                    {c.visitor_name ?? "Website visitor"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {c.topic_tag ?? "Untagged"} · {c.channel} ·{" "}
                    {formatDistanceToNow(new Date(c.updated_at + "Z"), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pStyle.className}`}>
                  {pStyle.label}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${style.className}`}
                >
                  <span>{style.icon}</span>
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
