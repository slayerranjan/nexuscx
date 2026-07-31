"use client";

import { useTransition } from "react";
import { reassignCase } from "./actions";

export function ReassignSelect({
  conversationId,
  agents,
  currentAgentId,
}: {
  conversationId: string;
  agents: { id: string; name: string }[];
  currentAgentId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 mb-4">
      <label className="text-xs text-ink-muted">Reassign to:</label>
      <select
        defaultValue={currentAgentId ?? ""}
        onChange={(e) => {
          if (e.target.value) {
            startTransition(() => reassignCase(conversationId, e.target.value));
          }
        }}
        disabled={pending}
        className="text-sm border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/30"
      >
        <option value="" disabled>
          Select agent…
        </option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {pending && <span className="text-xs text-ink-muted">Reassigning…</span>}
    </div>
  );
}