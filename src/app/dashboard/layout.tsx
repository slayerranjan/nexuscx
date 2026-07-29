import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-navy-deep flex flex-col shrink-0">
        <div className="flex items-center gap-2 px-4 py-5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 20H8L12 12L16 20H22L12 2Z" fill="#C8A84B" />
          </svg>
          <span className="text-white font-semibold text-sm">NexusCX</span>
        </div>
        <nav className="flex-1 px-2.5 space-y-0.5">
          <NavLink href="/dashboard">Overview</NavLink>
          <NavLink href="/dashboard/conversations">Live queue</NavLink>
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

function NavLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="block px-3 py-2 rounded-md text-sm text-steel-soft hover:bg-navy hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
