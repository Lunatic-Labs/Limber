"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import {
  DESCRIPTION_MAX_LENGTH,
  DIAGNOSIS_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@/lib/plans-shared";

type Patient = { id: string; label: string };

export function PlanForm({
  patients,
  initialPatientId,
}: {
  patients: Patient[];
  initialPatientId?: string;
}) {
  const router = useRouter();
  const [patientUserId, setPatientUserId] = useState(
    initialPatientId ?? (patients.length === 1 ? patients[0].id : "")
  );
  const [title, setTitle] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientUserId,
          title,
          diagnosis,
          description,
          startDate: startDate || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create the plan of care.");
        return;
      }
      // Land in the new conversation.
      router.push(`/physician/plans/${data.plan.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-slate-300 bg-card px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-brand-100 bg-card p-5 shadow-sm"
    >
      <div className="space-y-1">
        <label htmlFor="plan-patient" className="text-sm font-semibold">
          Patient
        </label>
        <select
          id="plan-patient"
          required
          value={patientUserId}
          onChange={(e) => setPatientUserId(e.target.value)}
          className={input}
        >
          <option value="">Select a patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="plan-title" className="text-sm font-semibold">
          Title
        </label>
        <input
          id="plan-title"
          required
          maxLength={TITLE_MAX_LENGTH}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Knee recovery"
          className={input}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan-diagnosis" className="text-sm font-semibold">
          Diagnosis
        </label>
        <textarea
          id="plan-diagnosis"
          required
          rows={2}
          maxLength={DIAGNOSIS_MAX_LENGTH}
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="e.g. ACL reconstruction, left knee"
          className={input}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan-description" className="text-sm font-semibold">
          Notes <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="plan-description"
          rows={3}
          maxLength={DESCRIPTION_MAX_LENGTH}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={input}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="plan-start" className="text-sm font-semibold">
          Start date <span className="font-normal text-ink-muted">(defaults to today)</span>
        </label>
        <input
          id="plan-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className={input}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={submitting} className={buttonClass("primary")}>
          {submitting ? "Creating…" : "Create plan of care"}
        </button>
        <Link href="/physician" className={buttonClass("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
