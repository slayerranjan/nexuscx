"use client";

import { useState, useTransition } from "react";
import { updateAgentChannelsAction } from "./actions";

interface Props {
  agentId: string;
  currentChannels: string;
}

export function AgentChannelsEditor({ agentId, currentChannels }: Props) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const initial = currentChannels.split(",").map((c) => c.trim());

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      const result = await updateAgentChannelsAction(agentId, formData);
      if (result?.success) setSaved(true);
    });
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-ink-muted">
        <input type="checkbox" name="channels" value="website" defaultChecked={initial.includes("website")} />
        Chat
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-muted">
        <input type="checkbox" name="channels" value="whatsapp" defaultChecked={initial.includes("whatsapp")} />
        WhatsApp
      </label>
      <label className="flex items-center gap-1 text-xs text-ink-muted">
        <input type="checkbox" name="channels" value="voice" defaultChecked={initial.includes("voice")} />
        Voice
      </label>
      <button
        type="submit"
        disabled={pending}
        className="text-xs bg-navy text-white px-2 py-1 rounded hover:bg-navy-soft disabled:opacity-50"
      >
        {pending ? "..." : saved ? "\u2713" : "Save"}
      </button>
    </form>
  );
}