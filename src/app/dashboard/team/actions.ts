"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgent } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { id } from "@/lib/db/queries";
import bcrypt from "bcryptjs";

export async function createAgent(formData: FormData) {
  const currentAgent = await getCurrentAgent();
  if (!currentAgent || currentAgent.role !== "admin") return { error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role = String(formData.get("role") ?? "agent");
    const channels = formData.getAll("channels").map((c) => String(c));

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (role !== "agent" && role !== "admin") {
    return { error: "Invalid role." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const agentId = id();

    try {
    await db.execute({
      sql: `INSERT INTO agents (id, organization_id, name, email, password_hash, role, channels) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [agentId, currentAgent.organization_id, name, email, passwordHash, role, channels.join(",") || "website,whatsapp,voice"],
    });
  } catch {
    return { error: "An agent with that email already exists." };
  }

  revalidatePath("/dashboard/team");
  return { success: true };
}


export async function updateAgentChannelsAction(agentId: string, formData: FormData) {
  const currentAgent = await getCurrentAgent();
  if (!currentAgent || currentAgent.role !== "admin") return { error: "Not authorized." };

  const channels = formData.getAll("channels").map((c) => String(c));

  await db.execute({
    sql: `UPDATE agents SET channels = ? WHERE id = ? AND organization_id = ?`,
    args: [channels.join(",") || "website,whatsapp,voice", agentId, currentAgent.organization_id],
  });

  revalidatePath("/dashboard/team");
  return { success: true };
}