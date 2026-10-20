"use client";

import { useRef, useState } from "react";
import {
  DEFAULT_PREFERENCES,
  preferencesToDataAttributes,
  type Preferences,
} from "@/lib/preferences-shared";
import { AccessibilityForm } from "@/components/settings/accessibility-form";
import { buttonClass } from "@/components/ui/button";

// Save-on-change wrapper for /settings. Applies the change to <html>
// immediately (live preview), then PUTs it; rolls back if the save fails.
export function AccessibilitySettings({ initial }: { initial: Preferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const saved = useRef(initial);
  const seq = useRef(0);

  function apply(p: Preferences) {
    for (const [k, v] of Object.entries(preferencesToDataAttributes(p))) {
      document.documentElement.setAttribute(k, v);
    }
  }

  async function save(next: Preferences) {
    if (saving) return;
    const mine = ++seq.current;
    setSaving(true);
    setPrefs(next);
    apply(next);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error();
      saved.current = next;
      if (mine === seq.current) setStatus("Saved");
    } catch {
      if (mine === seq.current) {
        setPrefs(saved.current);
        apply(saved.current);
        setStatus("Couldn't save your change. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <p role="status" aria-live="polite" className="mb-4 min-h-[1.5rem] text-sm text-ink-muted">
        {status}
      </p>
      <AccessibilityForm value={prefs} onChange={save} disabled={saving} />
      <button
        type="button"
        onClick={() => save(DEFAULT_PREFERENCES)}
        disabled={saving}
        className={buttonClass("secondary", "mt-6")}
      >
        Reset to defaults
      </button>
    </div>
  );
}
