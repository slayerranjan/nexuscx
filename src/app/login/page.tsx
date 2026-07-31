import { Suspense } from "react";
import { LoginForm } from "./login-form";
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-deep px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <NexusMark />
            <span className="text-surface font-semibold text-lg tracking-tight">NexusCX</span>
          </div>
          <p className="text-steel-soft text-sm">AI Customer Experience — Avtar India</p>
        </div>
        <div className="bg-surface rounded-lg shadow-xl p-8 border border-line">
          <Suspense fallback={<div className="text-sm text-ink-muted text-center py-8">Loading…</div>}>
           <LoginForm />
          </Suspense>
        </div>
        <div className="mt-6 text-center text-xs text-steel-soft space-y-1">
          <p>Demo logins (password: demo1234)</p>
          <p className="figure text-steel-soft">admin · agent @avtarretail.demo</p>
        </div>
      </div>
    </div>
  );
}

function NexusMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 20H8L12 12L16 20H22L12 2Z" fill="#C8A84B" />
    </svg>
  );
}
