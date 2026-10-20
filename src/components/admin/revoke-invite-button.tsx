"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/button";

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
      className={buttonClass("secondary", "px-4")}
    >
      {busy ? "Revoking..." : "Revoke"}
    </button>
  );
}
