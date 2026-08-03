import { notFound } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import {
  getConversation,
  listMessages,
  listAgentsWithLoad,
  listAgents,
  getCustomer,
  getOtherCustomerConversations,
  listCaseNotes,
} from "@/lib/db/queries";
import { ReplyBox } from "./reply-box";
import { CloseButton } from "./close-button";
import { ClaimButton } from "./claim-button";
import { ReassignSelect } from "./reassign-select";
import { CaseNotes } from "./case-notes";
import { EditableContact } from "./editable-contact";
import { ReopenButton } from "./reopen-button";
import { IssueCategory } from "./issue-category";
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

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getCurrentAgent();
  const conversation = await getConversation(id);
  if (!conversation || conversation.organization_id !== agent!.organization_id) notFound();

  const messages = await listMessages(id);
  const notesRaw = await listCaseNotes(id);
  const notes = notesRaw.map((n) => ({
    id: n.id,
    agent_name: n.agent_name,
    note: n.note,
    created_at: n.created_at,
  }));
  const style = RESOLUTION_STYLE[conversation.resolution];
  const pStyle = PRIORITY_STYLE[conversation.priority] ?? PRIORITY_STYLE.medium;

  const isAdmin = agent!.role === "admin";
  const needsHumanAction = conversation.resolution === "escalated" || conversation.resolution === "pending";
  const isUnassigned = !conversation.assigned_agent_id;
  const isMine = conversation.assigned_agent_id === agent!.id;
  const isSomeoneElses = !isUnassigned && !isMine && !isAdmin;
  const showClaim = needsHumanAction && isUnassigned && !isAdmin;
  const canReply = isAdmin || isMine;
  const isClosed = conversation.status === "closed";

  let suggestedName: string | undefined;
  if (isUnassigned) {
    const withLoad = (await listAgentsWithLoad(agent!.organization_id)).sort(
      (a, b) => a.openCases - b.openCases
    );
    suggestedName = withLoad[0]?.name;
  }

  const allAgentsRaw = isAdmin ? await listAgents(agent!.organization_id) : [];
  const allAgents = allAgentsRaw.map((a) => ({ id: a.id, name: a.name }));

  const customer = conversation.customer_id ? await getCustomer(conversation.customer_id) : null;
  const previousCases = conversation.customer_id
    ? await getOtherCustomerConversations(conversation.customer_id, conversation.id)
    : [];

  const initials = (conversation.visitor_name ?? "W V")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-8 max-w-5xl">
      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">
              Case #{conversation.id.slice(0, 6)} · {conversation.topic_tag ?? "Untagged"}
            </p>
            <p className="text-xs text-ink-muted mt-0.5">
              Opened {formatDistanceToNow(new Date(conversation.created_at + "Z"), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pStyle.className}`}>{pStyle.label}</span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.className}`}>{style.label}</span>
          </div>
        </div>

        {isSomeoneElses && (
          <div className="bg-line/60 border-b border-line px-5 py-2.5 text-sm text-ink-muted">
            This case is assigned to another agent. You can read the thread, but only they (or an admin) can
            reply or close it.
          </div>
        )}

        <div className="flex">
          <div className="flex-1 min-w-0 p-5 border-r border-line">
            {conversation.resolution === "escalated" && (
              <div className="bg-warning-soft border border-warning/30 rounded-lg px-4 py-3 mb-4 text-sm text-warning">
                The AI couldn&apos;t confidently resolve this — read below for its attempted answer before
                replying, so you&apos;re not starting from scratch.
              </div>
            )}

            <div className="space-y-3 mb-5">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.sender === "visitor"
                        ? "bg-canvas text-ink border border-line"
                        : m.sender === "agent"
                        ? "bg-navy text-white"
                        : "bg-gold-soft text-navy-deep border border-gold/30"
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

            {isClosed ? (
              <div className="bg-success-soft border border-success/30 rounded-lg px-4 py-2.5 text-sm text-success flex items-center justify-between">
                <span>✓ This case is closed. A new customer message will automatically reopen it.</span>
                {canReply && <ReopenButton conversationId={conversation.id} />}
              </div>
            ) : (
              <>
                {showClaim && (
                  <div className="mb-4">
                    <ClaimButton conversationId={conversation.id} suggested={suggestedName} />
                  </div>
                )}

                {canReply && (
                  <div className="flex items-center gap-3">
                    <ReplyBox conversationId={conversation.id} />
                    <CloseButton conversationId={conversation.id} closed={false} />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="w-64 shrink-0 p-5 flex flex-col gap-5">
            <div>
              <p className="text-[11px] text-steel uppercase tracking-wide mb-2">Customer</p>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-steel-soft flex items-center justify-center text-xs font-medium text-navy-deep shrink-0">
                  {initials}
                </div>
                <p className="text-sm font-medium text-ink">{conversation.visitor_name ?? "Website visitor"}</p>
              </div>
              {customer ? (
                <EditableContact
                  customerId={customer.id}
                  currentEmail={customer.email}
                  currentPhone={customer.phone}
                />
              ) : (
                <p className="text-xs text-ink-muted">No customer record linked.</p>
              )}
            </div>

            <div className="border-t border-line pt-4">
              <p className="text-[11px] text-steel uppercase tracking-wide mb-2">Case details</p>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-ink-muted">Assigned</span>
                <span className="text-ink">
                  {allAgentsRaw.find((a) => a.id === conversation.assigned_agent_id)?.name ?? "Unassigned"}
                </span>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-ink-muted">Channel</span>
                <span className="text-ink capitalize">{conversation.channel}</span>
              </div>
              <IssueCategory conversationId={conversation.id} current={conversation.issue_category ?? null} />
            </div>

            {isAdmin && !isUnassigned && (
              <div className="border-t border-line pt-4">
                <ReassignSelect
                  conversationId={conversation.id}
                  agents={allAgents}
                  currentAgentId={conversation.assigned_agent_id}
                />
              </div>
            )}

            <CaseNotes conversationId={conversation.id} notes={notes} />

            <div className="border-t border-line pt-4">
              <p className="text-[11px] text-steel uppercase tracking-wide mb-2">Previous cases</p>
              {previousCases.length === 0 ? (
                <p className="text-xs text-ink-muted">No other cases yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {previousCases.map((pc) => (
                    <Link
                      key={pc.id}
                      href={`/dashboard/conversations/${pc.id}`}
                      className="block text-xs text-navy hover:underline"
                    >
                      #{pc.id.slice(0, 6)} · {pc.topic_tag ?? "Untagged"}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}