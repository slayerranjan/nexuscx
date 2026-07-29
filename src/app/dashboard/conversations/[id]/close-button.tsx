"use client";

import { useTransition } from "react";
import { markClosed } from "./actions";

export function CloseButton({ conversationId, closed }: { conversationId: string; closed: boolean }) {
  const [pending, startTransition] = useTransition();

  if (closed) {
    return <span className="text-xs text-ink-muted shrink-0">Closed</span>;
  }

  return (
    <button
      onClick={() => startTransition(() => markClosed(conversationId))}
      disabled={pending}
      className="text-sm text-ink-muted hover:text-ink border border-line rounded-md px-3 py-2 transition-colors shrink-0"
    >
      Close
    </button>
  );
}
