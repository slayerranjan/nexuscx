"use client";

import { useState, useEffect } from "react";

interface Message {
  id: string;
  sender: "visitor" | "ai" | "agent";
  content: string;
  agent_name: string | null;
  escalation_flag: number;
}

export function LiveMessages({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/${conversationId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        const serverMessages = (data.messages ?? []).map(
          (m: { sender: string; content: string; agent_name: string | null; escalation_flag: boolean }, i: number) => ({
            id: `live-${i}`,
            sender: m.sender,
            content: m.content,
            agent_name: m.agent_name,
            escalation_flag: m.escalation_flag ? 1 : 0,
          })
        );
        setMessages((prev) => (serverMessages.length !== prev.length ? serverMessages : prev));
      } catch {
        // silent — retries in 3 seconds
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId]);

  return (
    <div className="space-y-3 mb-5">
      {messages.map((m) => (
        <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-start" : "justify-end"}`}>
          <div
            className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
              m.sender === "visitor"
                ? "bg-canvas text-ink border border-line"
                : m.sender === "agent"
                ? "bg-navy text-white"
                : "bg-gold-soft text-navy-deep border border-gold/30"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wide opacity-70 mb-1">
              {m.sender === "visitor" ? "Visitor" : m.sender === "agent" ? m.agent_name ?? "Agent" : "AI"}
            </p>
            {m.content}
            {!!m.escalation_flag && <p className="text-[11px] mt-1.5 opacity-80">↳ flagged for escalation</p>}
          </div>
        </div>
      ))}
    </div>
  );
}