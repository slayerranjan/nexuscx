import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { getUnassignedEscalatedCount } from "@/lib/db/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");

  const unassignedCount = await getUnassignedEscalatedCount(agent.organization_id);
  const isAdmin = agent.role === "admin";

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-navy-deep flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="bg-white rounded-md p-1 flex items-center justify-center">
            <img src="/avatar-logo.png" alt="Avatar India" className="h-4 w-auto" />
          </div>
          <span className="text-white font-semibold text-sm">AvatarIndiaCX</span>
        </div>
        <nav className="flex-1 px-2.5 space-y-0.5">
          <NavLink href="/dashboard">Overview</NavLink>
          <NavLink href="/dashboard/conversations" badge={unassignedCount}>
            Live queue
          </NavLink>
          {isAdmin && <NavLink href="/dashboard/team">Team performance</NavLink>}
          <NavLink href="/dashboard/customers">Customers</NavLink>
          <NavLink href="/dashboard/knowledge">Knowledge base</NavLink>
          <NavLink href="/dashboard/knowledge-gaps">Knowledge gaps</NavLink>
          <NavLink href="/widget-demo" external>
            Widget demo ↗
          </NavLink>
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-white text-sm">{agent.name}</p>
          <p className="text-steel-soft text-xs mb-2 capitalize">{agent.role}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  children,
  external,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center justify-between px-3 py-2 rounded-md text-sm text-steel-soft hover:bg-navy hover:text-white transition-colors"
    >
      <span>{children}</span>
      {!!badge && badge > 0 && (
        <span className="bg-danger text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
          {badge}
        </span>
      )}
    </Link>
  );
}