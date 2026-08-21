"use server";

import { getCurrentAgent } from "@/lib/auth";
import { setDisposition, getConversation } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";

export async function setDispositionAction(conversationId: string, disposition: string) {
  const agent = await getCurrentAgent();
  if (!agent) return { error: "Not authorized." };

  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.organization_id !== agent.organization_id) {
    return { error: "Not found." };
  }

  const valid = ["resolved", "escalated", "dropped", "follow_up_requested"];
  if (!valid.includes(disposition)) return { error: "Invalid disposition." };

  await setDisposition(conversationId, disposition as "resolved" | "escalated" | "dropped" | "follow_up_requested");
  revalidatePath(`/dashboard/conversations/${conversationId}`);
  revalidatePath("/dashboard/conversations");
  return { success: true };
}
