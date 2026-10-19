"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeInviteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function revoke() {
    setBusy(true);
    try {
      await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={revoke}
      disabled={busy}
      className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {busy ? "Revoking..." : "Revoke"}
    </button>
  );
}
