"use client";

import { useTransition } from "react";
import { claimCase } from "./actions";

export function ClaimButton({ conversationId, suggested }: { conversationId: string; suggested?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="bg-steel-soft/40 border border-steel/30 rounded-lg px-4 py-3 flex items-center justify-between">
      <p className="text-sm text-navy-deep">
        This case is unassigned.
        {suggested && <span className="text-ink-muted"> Suggested: {suggested} (fewest open cases).</span>}
      </p>
      <button
        onClick={() => startTransition(() => claimCase(conversationId))}
        disabled={pending}
        className="bg-navy hover:bg-navy-soft text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors disabled:opacity-50 shrink-0"
      >
        {pending ? "Claiming…" : "Claim this case"}
      </button>
    </div>
  );
}