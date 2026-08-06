"use client";

import { useState, useTransition } from "react";
import { createAgent } from "./actions";

export function AddAgentForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createAgent(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        const form = document.getElementById("add-agent-form") as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <form
      id="add-agent-form"
      action={handleSubmit}
      className="bg-surface border border-line rounded-lg p-4 space-y-3 mb-6"
    >
      <h2 className="text-sm font-medium text-ink mb-1">Add agent</h2>

      {error && (
        <div className="bg-danger-soft border border-danger/30 rounded-lg px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success-soft border border-success/30 rounded-lg px-3 py-2 text-xs text-success">
          ✓ Agent added. They can now sign in with the credentials you set.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder="Full name"
          className="rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          className="rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
        <select
          name="role"
          defaultValue="agent"
          className="rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        >
          <option value="agent">Agent</option>
          <option value="admin">Team Lead</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-navy hover:bg-navy-soft text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add agent"}
      </button>
    </form>
  );
}