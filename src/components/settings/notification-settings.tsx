// Placeholder: nothing sends notifications yet, so these toggles are
// disabled and don't save anything.
const channels = [
  { id: "notify-email", label: "Email", hint: "Get an email when you receive a new message." },
  { id: "notify-text", label: "Text message", hint: "Get a text when you receive a new message." },
];

export function NotificationSettings() {
  return (
    <div className="rounded-xl border border-brand-100 bg-card p-5 shadow-sm">
      <p className="mb-4 text-sm text-ink-muted">
        Notifications aren&apos;t available yet. These options will turn on in a future update.
      </p>
      <div className="space-y-4">
        {channels.map((c) => (
          <label key={c.id} htmlFor={c.id} className="flex items-start gap-3 opacity-60">
            <input id={c.id} type="checkbox" disabled className="mt-1 h-5 w-5" />
            <span>
              <span className="block font-medium">{c.label}</span>
              <span className="block text-sm text-ink-muted">{c.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
