export function PersonalDetails({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl border border-brand-100 bg-card p-5 shadow-sm">
      <dl className="space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-sm text-ink-muted">{r.label}</dt>
            <dd className="font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-ink-muted">These details are view-only for now.</p>
    </div>
  );
}
