import { notFound } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getConversation, listMessages, listAgentsWithLoad, listAgents } from "@/lib/db/queries";
import { ReplyBox } from "./reply-box";
import { CloseButton } from "./close-button";
import { ClaimButton } from "./claim-button";
import { ReassignSelect } from "./reassign-select";

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

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getCurrentAgent();
  const conversation = await getConversation(id);
  if (!conversation || conversation.organization_id !== agent!.organization_id) notFound();

  const messages = await listMessages(id);
  const style = RESOLUTION_STYLE[conversation.resolution];
  const pStyle = PRIORITY_STYLE[conversation.priority] ?? PRIORITY_STYLE.medium;

  const isAdmin = agent!.role === "admin";
  const needsHumanAction = conversation.resolution === "escalated" || conversation.resolution === "pending";
  const isUnassigned = !conversation.assigned_agent_id;
  const isMine = conversation.assigned_agent_id === agent!.id;
  const isSomeoneElses = !isUnassigned && !isMine && !isAdmin;
  const showClaim = needsHumanAction && isUnassigned && !isAdmin;
  const canReply = isAdmin || isMine;

  let suggestedName: string | undefined;
  if (isUnassigned) {
    const withLoad = (await listAgentsWithLoad(agent!.organization_id)).sort(
      (a, b) => a.openCases - b.openCases
    );
    suggestedName = withLoad[0]?.name;
  }

  const allAgentsRaw = isAdmin ? await listAgents(agent!.organization_id) : [];
  const allAgents = allAgentsRaw.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-lg font-semibold text-ink">{conversation.visitor_name ?? "Website visitor"}</h1>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pStyle.className}`}>
            {pStyle.label}
          </span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.className}`}>{style.label}</span>
        </div>
      </div>
      <p className="text-ink-muted text-sm mb-6">
        {conversation.topic_tag ?? "Untagged"} · {conversation.channel} conversation
      </p>

      {conversation.resolution === "escalated" && (
        <div className="bg-warning-soft border border-warning/30 rounded-lg px-4 py-3 mb-5 text-sm text-warning">
          The AI couldn&apos;t confidently resolve this — read the thread below for its attempted answer before
          replying, so you&apos;re not starting from scratch.
        </div>
      )}

      {isSomeoneElses && (
        <div className="bg-line/60 border border-line rounded-lg px-4 py-3 mb-5 text-sm text-ink-muted">
          This case is assigned to another agent. You can read the thread, but only they (or an admin) can
          reply or close it.
        </div>
      )}

      {isAdmin && !isUnassigned && (
        <ReassignSelect
          conversationId={conversation.id}
          agents={allAgents}
          currentAgentId={conversation.assigned_agent_id}
        />
      )}

      <div className="bg-surface border border-line rounded-lg p-5 space-y-3 mb-5">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                m.sender === "visitor"
                  ? "bg-canvas text-ink border border-line"
                  : m.sender === "agent"
                  ? "bg-navy text-white"
                  : "bg-steel-soft text-navy-deep"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wide opacity-70 mb-1">
                {m.sender === "visitor" ? "Visitor" : m.sender === "agent" ? m.agent_name ?? "Agent" : "AI"}
              </p>
              {m.content}
              {!!m.escalation_flag && (
                <p className="text-[11px] mt-1.5 opacity-80">↳ flagged for escalation</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {showClaim && (
        <div className="mb-4">
          <ClaimButton conversationId={conversation.id} suggested={suggestedName} />
        </div>
      )}

      {canReply && (
        <div className="flex items-center gap-3">
          <ReplyBox conversationId={conversation.id} />
          <CloseButton conversationId={conversation.id} closed={conversation.status === "closed"} />
        </div>
      )}
    </div>
  );
}