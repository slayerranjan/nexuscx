"use client";

import { useTransition } from "react";
import { setIssueCategory } from "./actions";

const CATEGORIES = ["Order tracking", "Refund", "Damaged item", "Exchange", "Other"];

export function IssueCategory({
  conversationId,
  current,
}: {
  conversationId: string;
  current: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <p className="text-[11px] text-steel uppercase tracking-wide mb-1.5">Issue category</p>
      <select
        defaultValue={current ?? ""}
        onChange={(e) => startTransition(() => setIssueCategory(conversationId, e.target.value))}
        disabled={pending}
        className="w-full text-xs border border-line rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/30 disabled:opacity-50"
      >
        <option value="" disabled>
          Select category…
        </option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}