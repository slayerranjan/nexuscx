"use client";

import { useState, useTransition } from "react";
import { sendAgentReply, getSuggestion } from "./actions";

export function ReplyBox({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [suggesting, startSuggestTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await sendAgentReply(conversationId, text);
      setText("");
    });
  }

  function suggest() {
    startSuggestTransition(async () => {
      const suggestion = await getSuggestion(conversationId);
      if (suggestion) setText(suggestion);
    });
  }

  return (
    <div className="flex-1 space-y-2">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Reply as agent…"
          className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
        <button
          onClick={submit}
          disabled={pending || !text.trim()}
          className="bg-navy hover:bg-navy-soft text-white text-sm font-medium px-4 rounded-md transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </div>
      <button
        onClick={suggest}
        disabled={suggesting}
        className="text-xs text-steel hover:text-navy underline transition-colors"
      >
        {suggesting ? "Thinking…" : "✨ Suggest reply with AI"}
      </button>
    </div>
  );
}