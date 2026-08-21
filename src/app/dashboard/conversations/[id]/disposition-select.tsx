"use client";

import { useState, useTransition } from "react";
import { setDispositionAction } from "./disposition-actions";

const LABELS: Record<string, string> = {
  resolved: "Resolved",
  escalated: "Escalated",
  dropped: "Call dropped / disconnected",
  follow_up_requested: "Customer requested follow-up",
};

export function DispositionSelect({ conversationId, current }: { conversationId: string; current: string | null }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current ?? "");

  function handleChange(newValue: string) {
    setValue(newValue);
    startTransition(async () => {
      await setDispositionAction(conversationId, newValue);
    });
  }

  return (
    <div>
      <p className="text-[11px] text-steel uppercase tracking-wide mb-2">Disposition</p>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={pending}
        className="w-full text-xs border border-line rounded-md px-2 py-1.5 text-ink-muted focus:outline-none focus:ring-2 focus:ring-navy/30"
      >
        <option value="">Select outcome…</option>
        {Object.entries(LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}