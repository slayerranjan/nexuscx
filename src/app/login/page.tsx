import { Suspense } from "react";
import { LoginForm } from "./login-form";
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-deep px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="bg-white rounded-md p-1.5 flex items-center justify-center">
              <img src="/avatar-logo.png" alt="Avatar India" className="h-5 w-auto" />
            </div>
            <span className="text-surface font-semibold text-lg tracking-tight">AvatarIndiaCX</span>
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

