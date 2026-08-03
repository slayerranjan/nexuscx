import { getCurrentAgent } from "@/lib/auth";
import { getOrgStats, getOrganization, getSlaStats, getAgentPersonalStats, getCompanyHealthSnapshot } from "@/lib/db/queries";

export default async function OverviewPage() {
  const agent = await getCurrentAgent();
  const org = await getOrganization(agent!.organization_id);

  if (agent!.role === "admin") {
    const stats = await getOrgStats(agent!.organization_id);
    const sla = await getSlaStats(agent!.organization_id);

    return (
      <div className="p-8 max-w-5xl">
        <h1 className="text-lg font-semibold text-ink">Overview</h1>
        <p className="text-ink-muted text-sm mb-6">{org?.name} · Team-wide</p>

        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard icon="◈" label="Total conversations" value={String(stats.total)} tone="navy" />
          <StatCard icon="✓" label="AI resolution rate" value={`${stats.resolutionRate}%`} tone="success" />
          <StatCard icon="!" label="Escalated to agent" value={String(stats.escalated)} tone="warning" />
          <StatCard icon="…" label="Pending" value={String(stats.pending)} tone="steel" />
        </div>

        <div className="bg-surface border border-line rounded-lg p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-medium text-ink mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-navy rounded-full inline-block" />
            Response & resolution time
          </h2>
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon="⚡"
              label="Avg. first response"
              value={sla.avgFirstResponseMinutes !== null ? `${sla.avgFirstResponseMinutes}m` : "—"}
              tone="navy"
              compact
            />
            <StatCard
              icon="!"
              label="Resolution — High priority"
              value={sla.avgResolutionMinutesByPriority.high !== null ? `${sla.avgResolutionMinutesByPriority.high}m` : "—"}
              tone="danger"
              compact
            />
            <StatCard
              icon="●"
              label="Resolution — Medium priority"
              value={sla.avgResolutionMinutesByPriority.medium !== null ? `${sla.avgResolutionMinutesByPriority.medium}m` : "—"}
              tone="warning"
              compact
            />
            <StatCard
              icon="○"
              label="Resolution — Low priority"
              value={sla.avgResolutionMinutesByPriority.low !== null ? `${sla.avgResolutionMinutesByPriority.low}m` : "—"}
              tone="steel"
              compact
            />
          </div>
          <p className="text-xs text-ink-muted mt-3">
            Resolution time is measured separately per priority level — a High and Low priority case aren&apos;t
            judged against the same expectation.
          </p>
        </div>

        <div className="bg-surface border border-line rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-medium text-ink mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-gold rounded-full inline-block" />
            Top conversation topics
          </h2>
          {stats.topTopics.length === 0 ? (
            <p className="text-sm text-ink-muted">No tagged conversations yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.topTopics.map(([topic, count]) => (
                <div key={topic} className="flex items-center gap-3">
                  <span className="text-sm text-ink w-44 shrink-0">{topic}</span>
                  <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
                    <div
                      className="h-full bg-navy rounded-full transition-all"
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

  const personal = await getAgentPersonalStats(agent!.organization_id, agent!.id);
  const health = await getCompanyHealthSnapshot(agent!.organization_id);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-lg font-semibold text-ink">Overview</h1>
      <p className="text-ink-muted text-sm mb-6">{org?.name}</p>

      <h2 className="text-xs font-medium text-steel uppercase tracking-wide mb-2">Company health</h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon="◈" label="Total conversations" value={String(health.total)} tone="navy" />
        <StatCard icon="✓" label="AI resolution rate" value={`${health.resolutionRate}%`} tone="success" />
        <StatCard icon="…" label="Pending" value={String(health.pending)} tone="steel" />
      </div>

      <h2 className="text-xs font-medium text-steel uppercase tracking-wide mb-2">Your performance</h2>
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard icon="◈" label="Cases assigned to you" value={String(personal.total)} tone="navy" />
        <StatCard icon="✓" label="Resolved" value={String(personal.resolved)} tone="success" />
        <StatCard icon="!" label="Currently open" value={String(personal.open)} tone="warning" />
        <StatCard
          icon="⚡"
          label="Avg. resolution time"
          value={personal.avgResolutionMinutes !== null ? `${personal.avgResolutionMinutes}m` : "—"}
          tone="steel"
        />
      </div>
    </div>
  );
}

const TONE_STYLES: Record<string, { border: string; text: string; iconBg: string }> = {
  navy: { border: "border-l-navy", text: "text-navy", iconBg: "bg-steel-soft text-navy" },
  success: { border: "border-l-success", text: "text-success", iconBg: "bg-success-soft text-success" },
  warning: { border: "border-l-warning", text: "text-warning", iconBg: "bg-warning-soft text-warning" },
  danger: { border: "border-l-danger", text: "text-danger", iconBg: "bg-danger-soft text-danger" },
  steel: { border: "border-l-steel", text: "text-navy", iconBg: "bg-steel-soft text-navy" },
};

function StatCard({
  icon,
  label,
  value,
  tone,
  compact,
}: {
  icon: string;
  label: string;
  value: string;
  tone: "navy" | "success" | "warning" | "danger" | "steel";
  compact?: boolean;
}) {
  const style = TONE_STYLES[tone];
  return (
    <div className={`bg-surface border border-line ${style.border} border-l-[3px] rounded-lg p-4 shadow-sm hover:shadow transition-shadow`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${style.iconBg}`}>
          {icon}
        </span>
        <p className="text-xs text-ink-muted">{label}</p>
      </div>
      <p className={`figure font-semibold ${style.text} ${compact ? "text-xl" : "text-2xl"}`}>{value}</p>
    </div>
  );
}