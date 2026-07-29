"use client";

import { useState, useTransition } from "react";
import { generateDraft } from "./actions";
import { addArticle } from "../knowledge/actions";

export function GapCard({
  topic,
  count,
  sampleQuestion,
}: {
  topic: string;
  count: number;
  sampleQuestion: string;
}) {
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);
  const [category, setCategory] = useState("General");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateDraft(topic, sampleQuestion);
      setDraft(result);
    });
  }

  function handleApprove() {
    if (!draft) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", draft.title);
      formData.set("content", draft.content);
      formData.set("category", category);
      await addArticle(formData);
      setSaved(true);
    });
  }

  if (saved) {
    return (
      <div className="bg-success-soft border border-success/30 rounded-lg p-4 text-sm text-success">
        ✓ Added to the knowledge base — future questions about &ldquo;{topic}&rdquo; will now be answered automatically.
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-ink">{topic}</h2>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-warning-soft text-warning">
          Escalated {count}×
        </span>
      </div>
      <p className="text-sm text-ink-muted mb-3">Example question: &ldquo;{sampleQuestion}&rdquo;</p>

      {!draft ? (
        <button
          onClick={handleGenerate}
          disabled={pending}
          className="bg-navy hover:bg-navy-soft text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
        >
          {pending ? "Drafting…" : "Generate AI draft"}
        </button>
      ) : (
        <div className="space-y-3 border-t border-line pt-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Content — review before approving</label>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              rows={5}
              className="w-full rounded-md border border-line px-3 py-2 text-sm resize-y"
            />
          </div>
          <button
            onClick={handleApprove}
            disabled={pending}
            className="bg-success hover:opacity-90 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            {pending ? "Saving…" : "Approve & add to knowledge base"}
          </button>
        </div>
      )}
    </div>
  );
}