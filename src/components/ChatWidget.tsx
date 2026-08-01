"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  sender: "visitor" | "ai" | "agent";
  content: string;
  escalated?: boolean;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorContact, setVisitorContact] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: "ai", content: "Hi! I'm the Avatar Retail Co assistant. Ask me about your order, returns, shipping, or your account — I'll help right away, or connect you with someone who can." },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, contactSubmitted]);

  function handleContactSubmit() {
    if (!visitorName.trim()) return;
    setContactSubmitted(true);
  }

  function handleSkip() {
    setVisitorName("Website visitor");
    setContactSubmitted(true);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { sender: "visitor", content: text }]);
    setSending(true);

    try {
      const isEmail = visitorContact.includes("@");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: text,
          visitorName: visitorName || "Website visitor",
          visitorEmail: isEmail ? visitorContact : undefined,
          visitorPhone: !isEmail && visitorContact ? visitorContact : undefined,
        }),
      });
      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { sender: "ai", content: data.reply, escalated: data.escalate }]);
    } catch {
      setMessages((m) => [...m, { sender: "ai", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-[360px] h-[480px] bg-surface rounded-xl shadow-2xl border border-line flex flex-col overflow-hidden">
          <div className="bg-navy px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">Avatar Retail Co</p>
              <p className="text-steel-soft text-xs">Usually replies instantly</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg leading-none">
              ×
            </button>
          </div>

          {!contactSubmitted ? (
            <div className="flex-1 flex flex-col justify-center px-5 py-4 bg-canvas">
              <p className="text-sm text-ink font-medium mb-1">Before we start…</p>
              <p className="text-xs text-ink-muted mb-4">
                So we can keep track of your conversation and reach you if needed.
              </p>
              <input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-md border border-line px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              />
              <input
                value={visitorContact}
                onChange={(e) => setVisitorContact(e.target.value)}
                placeholder="Email or WhatsApp number (optional)"
                className="w-full rounded-md border border-line px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              />
              <button
                onClick={handleContactSubmit}
                disabled={!visitorName.trim()}
                className="w-full bg-navy hover:bg-navy-soft text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 mb-2"
              >
                Start chat
              </button>
              <button onClick={handleSkip} className="text-xs text-ink-muted hover:text-ink underline mx-auto">
                Skip for now
              </button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 bg-canvas">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                        m.sender === "visitor"
                          ? "bg-navy text-white rounded-br-sm"
                          : "bg-surface text-ink border border-line rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                      {m.escalated && (
                        <div className="mt-1.5 pt-1.5 border-t border-line/50 text-[11px] text-steel flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                          Connecting you with a team member
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-surface border border-line rounded-lg rounded-bl-sm px-3 py-2 text-sm text-ink-muted">
                      Typing…
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-line p-2.5 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your message…"
                  className="flex-1 rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="bg-navy hover:bg-navy-soft text-white text-sm font-medium px-3.5 rounded-md transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-navy hover:bg-navy-soft shadow-xl flex items-center justify-center transition-colors"
        aria-label="Open chat"
      >
        {open ? (
          <span className="text-white text-2xl leading-none">×</span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4H20V16H7L4 19V4Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}