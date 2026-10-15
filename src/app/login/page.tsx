"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import { buttonClass } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Incorrect username or password.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface p-4">
      <div className="mb-6">
        <Wordmark />
      </div>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-ink-muted">Sign in to your Limber account.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="username" className="text-sm font-semibold">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={input}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-semibold">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className={buttonClass("primary", "w-full")}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
