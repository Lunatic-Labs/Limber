"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/button";

type Physician = { id: string; label: string };
type Role = "patient" | "physician" | "administrator";

export function InviteForm({ physicians }: { physicians: Physician[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("patient");
  const [physicianUserId, setPhysicianUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setInviteUrl(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          physicianUserId: role === "patient" ? physicianUserId : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send the invitation.");
        return;
      }
      if (data.emailSent) {
        setNotice(`Invitation emailed to ${data.invitation.email}.`);
      } else {
        setNotice(
          `Invitation created for ${data.invitation.email}, but email isn't set up${
            data.emailError ? ` (${data.emailError})` : ""
          }. Share this link with them:`
        );
        setInviteUrl(data.inviteUrl);
      }
      setEmail("");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  const needsPhysician = role === "patient";
  const input =
    "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-brand-100 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="invite-email" className="text-sm font-semibold">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="invite-role" className="text-sm font-semibold">
            Type
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={input}
          >
            <option value="patient">Patient</option>
            <option value="physician">Physician</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>
      </div>

      {needsPhysician && (
        <div className="space-y-1">
          <label htmlFor="invite-physician" className="text-sm font-semibold">
            Assigned physician
          </label>
          <select
            id="invite-physician"
            required
            value={physicianUserId}
            onChange={(e) => setPhysicianUserId(e.target.value)}
            className={input}
          >
            <option value="">Select a physician…</option>
            {physicians.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {physicians.length === 0 && (
            <p className="text-sm text-ink-muted">
              Invite a physician first, then you can invite their patients.
            </p>
          )}
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>}
      {notice && <p role="status" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {notice}
        </p>}
      {inviteUrl && (
        <input
          readOnly
          value={inviteUrl}
          onFocus={(e) => e.currentTarget.select()}
          className={`${input} bg-brand-50 text-sm`}
          aria-label="Invitation link"
        />
      )}

      <button
        type="submit"
        disabled={submitting}
        className={buttonClass("primary")}
      >
        {submitting ? "Sending..." : "Send invitation"}
      </button>
    </form>
  );
}
