"use server";

import { revalidatePath } from "next/cache";
import { createArticle } from "@/lib/db/queries";
import { getCurrentAgent } from "@/lib/auth";

export async function addArticle(formData: FormData) {
  const agent = await getCurrentAgent();
  if (!agent) return;

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "General").trim() || "General";
  if (!title || !content) return;

  await createArticle({ organizationId: agent.organization_id, title, content, category });
  revalidatePath("/dashboard/knowledge");
}