"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authenticate } from "./actions";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await authenticate(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push(params.get("callbackUrl") || "/dashboard");
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide uppercase">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue="admin@avtarretail.demo"
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs font-medium text-ink-muted mb-1.5 tracking-wide uppercase">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          defaultValue="demo1234"
          className="w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        />
      </div>
      {error && <p className="text-sm text-danger bg-danger-soft rounded-md px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-navy hover:bg-navy-soft text-white text-sm font-medium rounded-md py-2.5 transition-colors disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
