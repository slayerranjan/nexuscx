"use client";

import { useState, useTransition } from "react";
import { saveNote } from "./actions";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  agent_name: string;
  note: string;
  created_at: string;
}

export function CaseNotes({ conversationId, notes }: { conversationId: string; notes: Note[] }) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await saveNote(conversationId, text);
      setText("");
    });
  }

  return (
    <div className="border-t border-line pt-4">
      <p className="text-[11px] text-steel uppercase tracking-wide mb-2">Internal notes</p>
      <div className="space-y-2 mb-2 max-h-40 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-ink-muted">No notes yet.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="bg-canvas rounded-md px-2.5 py-2">
              <p className="text-xs text-ink">{n.note}</p>
              <p className="text-[10px] text-ink-muted mt-1">
                {n.agent_name} · {formatDistanceToNow(new Date(n.created_at + "Z"), { addSuffix: true })}
              </p>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a note…"
          className="flex-1 text-xs rounded-md border border-line px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
        <button
          onClick={submit}
          disabled={pending || !text.trim()}
          className="text-xs bg-navy hover:bg-navy-soft text-white px-2.5 rounded-md disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}