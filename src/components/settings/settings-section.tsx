// One anchored section of the Settings page. The sidebar links to #id.
export function SettingsSection({
  id,
  title,
  description,
  badge,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-20 lg:scroll-mt-8">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 id={`${id}-heading`} className="text-xl font-bold text-ink sm:text-2xl">
          {title}
        </h2>
        {badge && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
            {badge}
          </span>
        )}
      </div>
      {description && <p className="-mt-2 mb-4 text-ink-muted">{description}</p>}
      {children}
    </section>
  );
}
