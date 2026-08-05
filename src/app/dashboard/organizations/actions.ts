"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgent } from "@/lib/auth";
import { createOrganizationWithAdmin } from "@/lib/db/queries";
import bcrypt from "bcryptjs";

export async function createOrganization(formData: FormData) {
  const agent = await getCurrentAgent();
  if (!agent?.is_super_admin) return { error: "Not authorized." };

  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();
  const adminPassword = String(formData.get("adminPassword") ?? "").trim();

  if (!organizationName || !adminName || !adminEmail || !adminPassword) {
    return { error: "All fields are required." };
  }
  if (adminPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await createOrganizationWithAdmin({
    organizationName,
    adminName,
    adminEmail,
    adminPasswordHash: passwordHash,
  });

  revalidatePath("/dashboard/organizations");
  return { success: true };
}