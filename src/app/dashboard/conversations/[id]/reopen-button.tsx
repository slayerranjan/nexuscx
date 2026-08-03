"use client";

import { useTransition } from "react";
import { reopenCase } from "./actions";

export function ReopenButton({ conversationId }: { conversationId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => reopenCase(conversationId))}
      disabled={pending}
      className="text-xs font-medium text-success underline hover:no-underline disabled:opacity-50 shrink-0 ml-3"
    >
      {pending ? "Reopening…" : "Reopen"}
    </button>
  );
}