import { getCurrentAgent } from "@/lib/auth";
import { detectKnowledgeGaps } from "@/lib/db/queries";
import { GapCard } from "./gap-card";

export default async function KnowledgeGapsPage() {
  const agent = await getCurrentAgent();
  const gaps = detectKnowledgeGaps(agent!.organization_id, 2);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-lg font-semibold text-ink mb-1">Knowledge gaps</h1>
      <p className="text-ink-muted text-sm mb-6">
        Topics that keep escalating to a human — each one is a candidate for a new knowledge base article,
        AI-drafted and ready for your review.
      </p>

      {gaps.length === 0 ? (
        <div className="bg-surface border border-line rounded-lg p-6 text-sm text-ink-muted">
          No repeated gaps detected yet. This fills in once the same topic escalates 2 or more times —
          try asking the widget a few different questions that lead to escalation.
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((g) => (
            <GapCard key={g.topic} topic={g.topic} count={g.count} sampleQuestion={g.sampleQuestion} />
          ))}
        </div>
      )}
    </div>
  );
}