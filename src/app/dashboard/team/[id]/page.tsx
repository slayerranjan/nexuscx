import { notFound, redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getAgentById, getAgentPersonalStats } from "@/lib/db/queries";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await getCurrentAgent();
  if (admin!.role !== "admin") redirect("/dashboard");

  const targetAgent = await getAgentById(id);
  if (!targetAgent || targetAgent.organization_id !== admin!.organization_id) notFound();

  const personal = await getAgentPersonalStats(admin!.organization_id, targetAgent.id);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-lg font-semibold text-ink mb-1">{targetAgent.name}</h1>
      <p className="text-ink-muted text-sm mb-6 capitalize">
        {targetAgent.role} · {targetAgent.email}
      </p>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Cases assigned" value={String(personal.total)} />
        <StatCard label="Resolved" value={String(personal.resolved)} tone="success" />
        <StatCard label="Currently open" value={String(personal.open)} tone="warning" />
        <StatCard
          label="Avg. resolution time"
          value={personal.avgResolutionMinutes !== null ? `${personal.avgResolutionMinutes}m` : "—"}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  const color = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-navy";
  return (
    <div className="bg-surface border border-line rounded-lg p-4">
      <p className="text-xs text-ink-muted mb-1.5">{label}</p>
      <p className={`figure text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}