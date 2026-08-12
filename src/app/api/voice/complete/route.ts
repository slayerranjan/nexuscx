import { NextRequest, NextResponse } from "next/server";
import { getOrgIdByEmbedKey, isModuleEnabled } from "@/lib/db/queries";

export async function POST(req: NextRequest) {
  const embedKey = req.headers.get("x-embed-key");
  if (!embedKey) {
    return NextResponse.json({ error: "Missing embed key." }, { status: 403 });
  }

  const organizationId = await getOrgIdByEmbedKey(embedKey);
  if (!organizationId) {
    return NextResponse.json({ error: "Invalid embed key." }, { status: 403 });
  }

  const voiceEnabled = await isModuleEnabled(organizationId, "voice");

  return NextResponse.json({
    debug: true,
    organizationId,
    voiceEnabled,
  });
}