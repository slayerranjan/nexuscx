"use client";

import { useRef, useTransition } from "react";
import { addArticle } from "./actions";

export function NewArticleForm({
  prefillTitle,
  prefillQuestion,
}: {
  prefillTitle?: string;
  prefillQuestion?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await addArticle(formData);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="bg-surface border border-line rounded-lg p-4 space-y-3">
      {prefillQuestion && (
        <div className="bg-warning-soft border border-warning/30 rounded-lg px-3 py-2 text-xs text-warning">
          Drafting from a repeated escalation. Original question: &ldquo;{prefillQuestion}&rdquo;
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <input
          name="title"
          required
          defaultValue={prefillTitle ?? ""}
          placeholder="Article title"
          className="col-span-2 rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
        <input
          name="category"
          placeholder="Category (e.g. Orders)"
          className="rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
      </div>
      <textarea
        name="content"
        required
        rows={3}
        defaultValue={prefillQuestion ? `[Draft this answer based on: "${prefillQuestion}"]` : ""}
        placeholder="Article content — separate paragraphs with a blank line, each becomes a searchable chunk."
        className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy resize-y"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-navy hover:bg-navy-soft text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add article"}
      </button>
    </form>
  );
}