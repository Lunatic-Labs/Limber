"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DESCRIPTION_MAX_LENGTH,
  DIAGNOSIS_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@/lib/plans-shared";

type Props = {
  planId: string;
  status: string;
  title: string;
  diagnosis: string;
  description: string;
  startDate: string; // YYYY-MM-DD
  patientName: string;
  physicianName: string;
  canEdit: boolean;
  chatHref: string;
  backHref: string;
};

// "2026-11-02" -> "November 2, 2026" (UTC so the day never shifts).
function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-base">{children}</dd>
    </div>
  );
}

export function PlanDetails(props: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(props.title);
  const [diagnosis, setDiagnosis] = useState(props.diagnosis);
  const [description, setDescription] = useState(props.description);
  const [startDate, setStartDate] = useState(props.startDate);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function startEditing() {
    // Reset to what the server last gave us (drops abandoned edits).
    setTitle(props.title);
    setDiagnosis(props.diagnosis);
    setDescription(props.description);
    setStartDate(props.startDate);
    setError(null);
    setSaved(false);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${props.planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          diagnosis,
          description,
          startDate: startDate || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save your changes.");
        return;
      }
      setEditing(false);
      setSaved(true);
      router.refresh(); // re-render with the saved values
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-slate-300 bg-card px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <main className="mx-auto max-w-2xl">
      <Link
        href={props.backHref}
        className="mb-4 inline-flex min-h-[44px] items-center text-sm font-medium text-brand-700 hover:underline"
      >
        &lsaquo; Back
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{props.title}</h1>
        <StatusBadge status={props.status} />
      </div>

      {saved && !editing && (
        <p role="status" className="mb-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          Changes saved.
        </p>
      )}

      {editing ? (
        <form
          onSubmit={save}
          className="space-y-4 rounded-xl border border-brand-100 bg-card p-5 shadow-sm"
        >
          <div className="space-y-1">
            <label htmlFor="edit-title" className="text-sm font-semibold">Title</label>
            <input
              id="edit-title"
              required
              maxLength={TITLE_MAX_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-diagnosis" className="text-sm font-semibold">Diagnosis</label>
            <textarea
              id="edit-diagnosis"
              required
              rows={2}
              maxLength={DIAGNOSIS_MAX_LENGTH}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className={input}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-description" className="text-sm font-semibold">
              Notes <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <textarea
              id="edit-description"
              rows={4}
              maxLength={DESCRIPTION_MAX_LENGTH}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={input}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-start" className="text-sm font-semibold">Start date</label>
            <input
              id="edit-start"
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
            <button type="submit" disabled={saving} className={buttonClass("primary")}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className={buttonClass("secondary")}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <section
          aria-label="Plan of care details"
          className="space-y-5 rounded-xl border border-brand-100 bg-card p-5 shadow-sm"
        >
          <dl className="space-y-5">
            <Field label="Diagnosis">{props.diagnosis || "Not recorded"}</Field>
            <Field label="Notes">{props.description || "None"}</Field>
            <Field label="Start date">{formatDay(props.startDate)}</Field>
            <Field label="Patient">{props.patientName}</Field>
            <Field label="Physician">{props.physicianName}</Field>
          </dl>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={props.chatHref} className={buttonClass("primary")}>
              Open messages
            </Link>
            {props.canEdit && (
              <button type="button" onClick={startEditing} className={buttonClass("secondary")}>
                Edit details
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
