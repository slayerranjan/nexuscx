# NexusCX — Build Notes

AI Customer Experience Platform (Avtar India / NexusAI). Built session-by-session,
hands-on, with real bugs found and fixed along the way — this file is the honest
record of what's real, what's not, and what to do next.

## Running it locally

npm install
npm run seed     # wipes and recreates demo data
npm run dev       # http://localhost:3000

Demo logins (password for both: demo1234):
  admin@avtarretail.demo   (Admin)
  agent@avtarretail.demo   (Agent — Devansh Rao)

Add your own key to .env.local as ANTHROPIC_API_KEY to get real AI-generated
replies. Without it, the widget falls back to a clearly-labeled template reply.

## What's genuinely real, not mocked

- Real BM25 lexical search over the knowledge base (no external embeddings API —
  this sandbox/environment could only reach api.anthropic.com, so retrieval uses
  a local scorer with stemming + a support-domain synonym map instead of vector
  search). Swap `retrieveRelevantChunks` in src/lib/ai/retrieval.ts for a real
  vector lookup if deploying somewhere with embeddings API access.
- Real Claude-generated chat responses (src/lib/ai/chatEngine.ts), with escalation
  detection via a [[ESCALATE]] tag the model appends when it can't confidently
  answer from the knowledge base, or the visitor asks for a human.
- Real auth (NextAuth + bcrypt), real permission logic (see below), real SQLite
  database (Node's built-in node:sqlite module — chosen because this build
  environment couldn't reach Prisma's or better-sqlite3's binary download CDNs).

## Permission model (built and tested this session)

- Admin: full access to every conversation, can reassign, manage knowledge base.
- Agent: full read access to all conversations (team visibility), but can only
  reply to / close cases assigned to them. Unassigned escalated/pending cases
  show a "Claim this case" button with a suggested agent (fewest open cases).
  Claiming assigns it; only then does the reply box appear.
- Sending a reply does NOT auto-resolve a conversation — only the explicit
  Close button does. This matches real support tooling (Zendesk/Freshdesk):
  a reply and a resolution are separate actions.

## Known limitations / not yet built

- Single organization only — no multi-tenant switching.
- WhatsApp and voice channels are schema-ready (channel field exists) but have
  no actual integration code yet — Meta/Twilio's domains weren't reachable
  from the sandbox this was built in, so that's untested, not just unbuilt.
- Sentiment field is manually set in seed data, not AI-computed from real
  conversations yet.
- No audit log of who viewed/edited what.
- "Escalated but closed" vs "escalated but still being worked" aren't visually
  distinguished yet — flagged during testing, deferred intentionally.
- Message-level agent attribution only applies to messages sent after this
  field was added — earlier seeded messages show generic "Agent."

## Bugs found and fixed this session (for the record)

1. BM25 retrieval missed "arrived" vs "arrives" (no stemming) and "broken" vs
   "damaged" (no synonyms) — fixed with a light stemmer + domain synonym map.
2. Claim button appeared on already-AI-resolved conversations, not just ones
   needing human action — fixed by checking resolution status, not just
   assignment status.
3. Reply box was visible even on unclaimed cases, bypassing the Claim
   requirement entirely — canReply condition was accidentally identical to
   the Claim-button condition.
4. Every agent reply auto-marked the conversation "resolved," even mid-thread
   — removed, now only the Close button resolves it.