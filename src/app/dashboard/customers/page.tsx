import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { listCustomers } from "@/lib/db/queries";
import { formatDistanceToNow } from "date-fns";

export default async function CustomersPage() {
  const agent = await getCurrentAgent();
  const customers = listCustomers(agent!.organization_id);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Customers</h1>
      <p className="text-ink-muted text-sm mb-6">
        Every customer who's messaged, with their full conversation history in one place.
      </p>

      <div className="bg-surface border border-line rounded-lg divide-y divide-line overflow-hidden">
        {customers.length === 0 && (
          <p className="p-5 text-sm text-ink-muted">No customers yet — try the widget demo.</p>
        )}
        {customers.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/customers/${c.id}`}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-canvas transition-colors"
          >
            <div>
              <p className="text-sm text-ink font-medium">{c.name ?? "Unnamed visitor"}</p>
              <p className="text-xs text-ink-muted">
                First seen {formatDistanceToNow(new Date(c.first_seen_at + "Z"), { addSuffix: true })}
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-steel-soft text-navy-deep">
              {c.conversationCount} conversation{c.conversationCount === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}