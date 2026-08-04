"use client";

import { useState, useTransition, useRef } from "react";
import { sendAgentReply, getSuggestion, signalTyping } from "./actions";

export function ReplyBox({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [suggesting, startSuggestTransition] = useTransition();
  const lastTypingSignalRef = useRef(0);

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await sendAgentReply(conversationId, text);
      setText("");
    });
  }

  function handleInputChange(value: string) {
    setText(value);
    // Throttle to at most once every 3 seconds — no need to hit the
    // database on every keystroke, just often enough to keep the
    // customer-facing "typing" flag alive.
    const now = Date.now();
    if (now - lastTypingSignalRef.current > 3000) {
      lastTypingSignalRef.current = now;
      signalTyping(conversationId);
    }
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
          onChange={(e) => handleInputChange(e.target.value)}
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