import { getCurrentAgent } from "@/lib/auth";
import { getOrgStats, getOrganization } from "@/lib/db/queries";

export default async function OverviewPage() {
  const agent = await getCurrentAgent();
  const org = getOrganization(agent!.organization_id);
  const stats = getOrgStats(agent!.organization_id);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-lg font-semibold text-ink">Overview</h1>
      <p className="text-ink-muted text-sm mb-6">{org?.name}</p>

      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard label="Total conversations" value={String(stats.total)} />
        <StatCard label="AI resolution rate" value={`${stats.resolutionRate}%`} tone="success" />
        <StatCard label="Escalated to agent" value={String(stats.escalated)} tone="warning" />
        <StatCard label="Pending" value={String(stats.pending)} />
      </div>

      <div className="bg-surface border border-line rounded-lg p-5">
        <h2 className="text-sm font-medium text-ink mb-4">Top conversation topics</h2>
        {stats.topTopics.length === 0 ? (
          <p className="text-sm text-ink-muted">No tagged conversations yet.</p>
        ) : (
          <div className="space-y-2.5">
            {stats.topTopics.map(([topic, count]) => (
              <div key={topic} className="flex items-center gap-3">
                <span className="text-sm text-ink w-44 shrink-0">{topic}</span>
                <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-navy rounded-full"
                    style={{ width: `${Math.min((count / stats.total) * 100 * 3, 100)}%` }}
                  />
                </div>
                <span className="figure text-xs text-ink-muted w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
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