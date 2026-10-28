"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Physician-only control at the bottom of the Info tab. Archiving is
// one-way, so it asks for confirmation first. On success the page is
// refreshed and the plan becomes read-only.
export function ArchivePlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function archive() {
    if (
      !window.confirm(
        "Archive this plan of care? Messages and files stay viewable, but no new messages can be sent."
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}/archive`, { method: "POST" });
      if (!res.ok && res.status !== 409) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not archive this plan.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={archive}
        disabled={busy}
        className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-red-300 bg-card px-5 py-2 text-base font-semibold text-red-700 transition duration-fast hover:bg-red-50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Archiving…" : "Archive plan of care"}
      </button>
      <p className="text-center text-xs text-gray-500">
        Messages and files stay viewable; no new messages can be sent.
      </p>
      {error && (
        <p role="alert" className="text-center text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
