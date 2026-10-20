export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      data-decorative
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 ${
        size === "sm" ? "h-8 w-8 text-xs" : "h-11 w-11 text-sm"
      }`}
    >
      {initials || "?"}
    </span>
  );
}
