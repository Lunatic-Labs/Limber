const styles: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-slate-100 text-slate-700",
  archived: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
        styles[status] ?? styles.completed
      }`}
    >
      {status}
    </span>
  );
}
