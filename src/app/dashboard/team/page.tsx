import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { getTeamPerformance } from "@/lib/db/queries";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const agent = await getCurrentAgent();
  if (agent!.role !== "admin") redirect("/dashboard");

  const team = await getTeamPerformance(agent!.organization_id);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Team performance</h1>
      <p className="text-ink-muted text-sm mb-6">
        Side-by-side summary of every agent&apos;s caseload — click a name for their full detail. Admin only.
      </p>

      <div className="bg-surface border border-line rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy text-white text-left">
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Resolved</th>
              <th className="px-4 py-3 font-medium">Open</th>
              <th className="px-4 py-3 font-medium">Avg. resolution</th>
            </tr>
          </thead>
          <tbody>
            {team.map((t, i) => (
              <tr key={t.id} className={i % 2 === 0 ? "bg-gold-soft/20" : "bg-surface"}>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/team/${t.id}`} className="text-ink font-medium hover:text-navy hover:underline">
                    {t.name}
                  </Link>{" "}
                  <span className="text-ink-muted text-xs capitalize">({t.role})</span>
                </td>
                <td className="px-4 py-3 text-ink">{t.total}</td>
                <td className="px-4 py-3 text-success font-medium">{t.resolved}</td>
                <td className="px-4 py-3 text-warning">{t.open}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {t.avgResolutionMinutes !== null ? `${t.avgResolutionMinutes}m` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}