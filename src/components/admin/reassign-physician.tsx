"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/button";

type Physician = { id: string; label: string };

// Inline physician picker for a patient row in the admin user table.
export function ReassignPhysician({
  patientId,
  patientName,
  currentPhysicianId,
  physicians,
}: {
  patientId: string;
  patientName: string;
  currentPhysicianId: string | null;
  physicians: Physician[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentPhysicianId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changed = value !== "" && value !== currentPhysicianId;

  async function save() {
    const target = physicians.find((p) => p.id === value)?.label ?? "the new physician";
    if (
      !window.confirm(
        `Reassign ${patientName} to ${target}? Their active plans of care will be archived, and ${target} will need to create a new one.`
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/patients/${patientId}/physician`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ physicianUserId: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not change the physician.");
        return;
      }
      setMessage(
        data.plansArchived > 0
          ? `Saved. ${data.plansArchived} active plan${data.plansArchived === 1 ? "" : "s"} archived.`
          : "Saved."
      );
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <select
          aria-label={`Physician for ${patientName}`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage(null);
          }}
          className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
        >
          {!currentPhysicianId && <option value="">Select…</option>}
          {physicians.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {changed && (
          <button
            onClick={save}
            disabled={busy}
            className={buttonClass("primary", "px-4")}
          >
            {busy ? "Saving..." : "Save"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="text-xs text-ink-muted">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
