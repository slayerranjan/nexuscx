"use client";

export function AgentFilterSelect({
  agents,
  currentAgent,
  currentPriority,
}: {
  agents: { id: string; name: string }[];
  currentAgent?: string;
  currentPriority?: string;
}) {
  return (
    <select
      defaultValue={currentAgent ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (currentPriority) params.set("priority", currentPriority);
        if (e.target.value) params.set("agent", e.target.value);
        const q = params.toString();
        window.location.href = `/dashboard/conversations${q ? `?${q}` : ""}`;
      }}
      className="text-xs border border-line rounded-full px-3 py-1.5 text-ink-muted focus:outline-none focus:ring-2 focus:ring-navy/30"
    >
      <option value="">Filter by agent…</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  );
}