import { notFound } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getCustomer, getCustomerConversations, listMessages } from "@/lib/db/queries";
import { formatDistanceToNow } from "date-fns";

const RESOLUTION_STYLE: Record<string, { label: string; className: string }> = {
  ai_resolved: { label: "AI resolved", className: "bg-success-soft text-success" },
  escalated: { label: "Escalated", className: "bg-warning-soft text-warning" },
  agent_resolved: { label: "Agent resolved", className: "bg-steel-soft text-navy-deep" },
  pending: { label: "Pending", className: "bg-line text-ink-muted" },
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getCurrentAgent();
  const customer = await getCustomer(id);
  if (!customer || customer.organization_id !== agent!.organization_id) notFound();

  const conversations = await getCustomerConversations(id);

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-lg font-semibold text-ink mb-1">{customer.name ?? "Unnamed visitor"}</h1>
      <p className="text-ink-muted text-sm mb-6">
        Customer since {formatDistanceToNow(new Date(customer.first_seen_at + "Z"), { addSuffix: true })}
        {" · "}
        {conversations.length} conversation{conversations.length === 1 ? "" : "s"} total
      </p>

      <div className="space-y-4">
        {await Promise.all(
          conversations.map(async (conv) => {
            const messages = await listMessages(conv.id);
            const style = RESOLUTION_STYLE[conv.resolution];
            return (
              <div key={conv.id} className="bg-surface border border-line rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-ink-muted">
                    {formatDistanceToNow(new Date(conv.created_at + "Z"), { addSuffix: true })} ·{" "}
                    {conv.topic_tag ?? "Untagged"}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.className}`}>
                    {style.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {messages.slice(0, 4).map((m) => (
                    <p key={m.id} className="text-sm">
                      <span className="text-ink-muted font-medium">
                        {m.sender === "visitor" ? "Them: " : m.sender === "agent" ? `${m.agent_name ?? "Agent"}: ` : "AI: "}
                      </span>
                      <span className="text-ink">{m.content}</span>
                    </p>
                  ))}
                  {messages.length > 4 && (
                    <p className="text-xs text-ink-muted">+ {messages.length - 4} more messages</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}