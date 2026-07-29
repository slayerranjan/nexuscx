"use server";

import { draftKnowledgeArticle } from "@/lib/ai/draftArticle";

export async function generateDraft(topic: string, sampleQuestion: string) {
  return draftKnowledgeArticle(topic, sampleQuestion);
}