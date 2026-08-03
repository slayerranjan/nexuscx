"use client";

import { useState, useTransition } from "react";
import { updateContact } from "./actions";

export function EditableContact({
  customerId,
  currentEmail,
  currentPhone,
}: {
  customerId: string;
  currentEmail: string | null;
  currentPhone: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(currentEmail ?? "");
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateContact(customerId, { email, phone });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-left w-full group">
        <p className="text-xs text-ink-muted mb-1 border-b border-dotted border-line group-hover:text-navy group-hover:border-navy inline-flex items-center gap-1 pb-0.5">
          <span aria-hidden="true">✎</span>
          {currentEmail ?? "Add email"}
        </p>
        <p className="text-xs text-ink-muted border-b border-dotted border-line group-hover:text-navy group-hover:border-navy inline-flex items-center gap-1 pb-0.5">
          <span aria-hidden="true">✎</span>
          {currentPhone ?? "Add phone"}
        </p>
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full text-xs rounded-md border border-line px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/30"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className="w-full text-xs rounded-md border border-line px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/30"
      />
      <div className="flex gap-1.5">
        <button
          onClick={save}
          disabled={pending}
          className="text-xs bg-navy hover:bg-navy-soft text-white px-2.5 py-1 rounded-md disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs text-ink-muted px-2">
          Cancel
        </button>
      </div>
    </div>
  );
}