"use client";

import { useState, useTransition } from "react";
import { createOrganization } from "./actions";

export function NewOrgForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createOrganization(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        const form = document.getElementById("new-org-form") as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <form
      id="new-org-form"
      action={handleSubmit}
      className="bg-surface border border-line rounded-lg p-4 space-y-3"
    >
      <h2 className="text-sm font-medium text-ink mb-1">Create new organization</h2>

      {error && (
        <div className="bg-danger-soft border border-danger/30 rounded-lg px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success-soft border border-success/30 rounded-lg px-3 py-2 text-xs text-success">
          ✓ Organization created. The admin can now sign in with the credentials you set.
        </div>
      )}

      <input
        name="organizationName"
        required
        placeholder="Company name"
        className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          name="adminName"
          required
          placeholder="Admin's full name"
          className="rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
        <input
          name="adminEmail"
          type="email"
          required
          placeholder="Admin's email"
          className="rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
      </div>
      <input
        name="adminPassword"
        type="password"
        required
        minLength={8}
        placeholder="Admin's password (min 8 characters)"
        className="w-full rounded-md border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
      />

      <button
        type="submit"
        disabled={pending}
        className="bg-navy hover:bg-navy-soft text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create organization"}
      </button>
    </form>
  );
}