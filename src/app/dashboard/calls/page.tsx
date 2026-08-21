import { getCurrentAgent } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LiveCallConsolePage() {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");
  if (!agent.channels.includes("voice")) redirect("/dashboard");

  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-ink mb-1">Live call console</h1>
      <p className="text-ink-muted text-sm">Voice call handling — coming online here.</p>
    </div>
  );
}