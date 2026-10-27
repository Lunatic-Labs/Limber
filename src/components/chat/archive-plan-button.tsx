"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Physician-only control in the chat header. Archiving is one-way, so it
// asks for confirmation first. On success the page is refreshed and the
// chat re-renders read-only.
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
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={archive}
        disabled={busy}
        className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-brand-800 transition duration-fast hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
      >
        {busy ? "Archiving…" : "Archive"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
