"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DESCRIPTION_MAX_LENGTH,
  DIAGNOSIS_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@/lib/plans-shared";

export const PLAN_EDIT_FORM_ID = "plan-edit-form";

// Inline editor for the Info tab. Its Save button lives in the screen
// header (it targets this form by id); Cancel there just drops the
// `edit` search param, which unmounts this form and discards changes.
export function PlanEditForm({
  planId,
  infoHref,
  initial,
}: {
  planId: string;
  infoHref: string;
  initial: {
    title: string;
    diagnosis: string;
    description: string;
    startDate: string; // YYYY-MM-DD
  };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [diagnosis, setDiagnosis] = useState(initial.diagnosis);
  const [description, setDescription] = useState(initial.description);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}`, {
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
      router.replace(infoHref);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      saving.current = false;
    }
  }

  const input =
    "min-h-[44px] w-full rounded-lg border border-slate-300 bg-card px-3 py-2 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";

  return (
    <form id={PLAN_EDIT_FORM_ID} onSubmit={save} className="space-y-4">
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
          Details <span className="font-normal text-ink-muted">(optional)</span>
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
    </form>
  );
}
