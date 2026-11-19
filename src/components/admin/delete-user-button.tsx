"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteConfirmMessage, type UserRole } from "@/lib/user-deletion";

// Trash icon shown to the left of a user's name in the admin table. Pressing
// it asks the admin to confirm (the action can't be undone), then deletes the
// user. `blockedReason` is set when the server would refuse (e.g. a physician
// who still has patients); it's shown instead of the confirmation.
export function DeleteUserButton({
  userId,
  name,
  role,
  blockedReason,
}: {
  userId: string;
  name: string;
  role: UserRole;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the admin presses the icon on a blocked user. Kept as a flag (not
  // a copy of the text) so it follows `blockedReason` after the page refreshes
  // and disappears once the block is gone.
  const [triedBlocked, setTriedBlocked] = useState(false);

  async function remove() {
    if (blockedReason) {
      setTriedBlocked(true);
      return;
    }
    setTriedBlocked(false);
    if (!window.confirm(deleteConfirmMessage(name, role))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not delete this user.");
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
    <div>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-ink-muted transition duration-fast hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
      {(triedBlocked && blockedReason ? blockedReason : error) && (
        <p role="alert" className="max-w-xs text-xs text-red-700">
          {triedBlocked && blockedReason ? blockedReason : error}
        </p>
      )}
    </div>
  );
}
