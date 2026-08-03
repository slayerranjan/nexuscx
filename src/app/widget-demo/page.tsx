import { ChatWidget } from "@/components/ChatWidget";

export default function WidgetDemoPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-surface border-b border-line px-8 py-4 flex items-center justify-between">
        <span className="font-semibold text-navy text-lg">Avatar Retail Co</span>
        <nav className="flex gap-6 text-sm text-ink-muted">
          <span>Shop</span>
          <span>Orders</span>
          <span>Account</span>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16 text-center">
        <p className="text-xs tracking-widest text-steel font-medium mb-3">DEMO STOREFRONT</p>
        <h1 className="text-3xl font-semibold text-ink mb-4">This is a stand-in for your website</h1>
        <p className="text-ink-muted max-w-lg mx-auto leading-relaxed">
          The chat bubble in the bottom-right corner is the actual NexusCX widget, wired to the same
          knowledge base and AI engine agents see in the dashboard. Try asking about an order, a return,
          shipping cost, or something that should escalate — like a damaged item or a billing dispute.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-3 max-w-md mx-auto text-left text-sm">
          <SuggestedQuestion text="When will my order arrive?" />
          <SuggestedQuestion text="Do you offer free shipping?" />
          <SuggestedQuestion text="My item arrived broken" />
          <SuggestedQuestion text="I was charged twice" />
        </div>
      </main>

      <ChatWidget />
    </div>
  );
}

function SuggestedQuestion({ text }: { text: string }) {
  return (
    <div className="bg-surface border border-line rounded-lg px-3.5 py-2.5 text-ink-muted">
      &ldquo;{text}&rdquo;
    </div>
  );
}
