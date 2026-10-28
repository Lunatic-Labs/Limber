"use client";

import type { Preferences } from "@/lib/preferences-shared";

// Controlled, presentation-only form for accessibility preferences.
// Reused by /settings and (later) the admin-invite onboarding step —
// see "Accessibility Preferences" in constitution.md.

// Whitespace-free so aria-labelledby treats it as a single ID reference.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type ChoiceKey = "textSize" | "contrast" | "messageDensity";
type ToggleKey =
  | "reducedMotion"
  | "largeTouchTargets"
  | "simplifiedLayout"
  | "dyslexiaFont"
  | "boldText";

const sections: {
  title: string;
  blurb: string;
  choices?: { key: ChoiceKey; label: string; options: [string, string][] }[];
  toggles?: { key: ToggleKey; label: string; help: string }[];
}[] = [
  {
    title: "Vision",
    blurb: "Make text easier to see.",
    choices: [
      {
        key: "textSize",
        label: "Text size",
        options: [["default", "Default"], ["large", "Large"], ["xlarge", "Extra large"]],
      },
      {
        key: "contrast",
        label: "Contrast",
        options: [["standard", "Standard"], ["high", "High contrast"]],
      },
    ],
    toggles: [
      { key: "boldText", label: "Bold text", help: "Show all text in a heavier weight." },
    ],
  },
  {
    title: "Motor & touch",
    blurb: "Easier tapping and less movement.",
    toggles: [
      { key: "largeTouchTargets", label: "Larger buttons and tap areas", help: "Helpful for limited hand mobility or when using the app mid-exercise." },
      { key: "reducedMotion", label: "Reduce motion", help: "Turn off animations and transitions." },
    ],
  },
  {
    title: "Reading & clarity",
    blurb: "Reduce visual clutter and make text easier to read.",
    choices: [
      {
        key: "messageDensity",
        label: "Message spacing",
        options: [["comfortable", "Comfortable"], ["compact", "Compact"]],
      },
    ],
    toggles: [
      { key: "simplifiedLayout", label: "Simplified layout", help: "Hide decorative elements and add more spacing." },
      { key: "dyslexiaFont", label: "Dyslexia-friendly font", help: "Use a highly legible typeface with extra spacing." },
    ],
  },
];

export function AccessibilityForm({
  value,
  onChange,
  disabled = false,
}: {
  value: Preferences;
  onChange: (next: Preferences) => void;
  disabled?: boolean;
}) {
  const set = <K extends keyof Preferences>(key: K, v: Preferences[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section
          key={section.title}
          aria-labelledby={`a11y-${slug(section.title)}`}
          className="rounded-xl border border-brand-100 bg-card p-5 shadow-sm"
        >
          <h2 id={`a11y-${slug(section.title)}`} className="text-lg font-semibold">
            {section.title}
          </h2>
          <p className="mb-4 text-sm text-ink-muted">{section.blurb}</p>

          <div className="space-y-5">
            {section.choices?.map((c) => (
              <fieldset key={c.key} disabled={disabled}>
                <legend className="mb-2 font-medium">{c.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {c.options.map(([optValue, optLabel]) => {
                    const selected = value[c.key] === optValue;
                    return (
                      <label
                        key={optValue}
                        className={`flex min-h-[44px] cursor-pointer items-center rounded-lg border px-4 text-base font-medium focus-within:ring-2 focus-within:ring-brand-500 ${
                          selected
                            ? "border-brand-600 bg-brand-50 text-brand-800"
                            : "border-brand-200 text-ink hover:bg-brand-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={c.key}
                          value={optValue}
                          checked={selected}
                          onChange={() => set(c.key, optValue as never)}
                          className="sr-only"
                        />
                        {optLabel}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            {section.toggles?.map((t) => (
              <label
                key={t.key}
                className="flex min-h-[44px] cursor-pointer items-start gap-3"
              >
                <input
                  type="checkbox"
                  role="switch"
                  checked={value[t.key]}
                  disabled={disabled}
                  onChange={(e) => set(t.key, e.target.checked as never)}
                  className="mt-1 h-5 w-5 shrink-0 accent-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                />
                <span>
                  <span className="block font-medium">{t.label}</span>
                  <span className="block text-sm text-ink-muted">{t.help}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
