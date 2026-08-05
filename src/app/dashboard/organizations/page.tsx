import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { listAllOrganizations } from "@/lib/db/queries";
import { NewOrgForm } from "./new-org-form";
import { formatDistanceToNow } from "date-fns";

export default async function OrganizationsPage() {
  const agent = await getCurrentAgent();
  if (!agent?.is_super_admin) redirect("/dashboard");

  const orgs = await listAllOrganizations();

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Organizations</h1>
      <p className="text-ink-muted text-sm mb-6">
        Every company using this platform. Super-admin only.
      </p>

      <NewOrgForm />

      <div className="mt-8 bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden">
        {orgs.map((o) => (
          <div key={o.id} className="px-5 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{o.name}</p>
              <p className="text-xs text-ink-muted">
                {o.agentCount} agent{o.agentCount === 1 ? "" : "s"} · created{" "}
                {formatDistanceToNow(new Date(o.created_at + "Z"), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}