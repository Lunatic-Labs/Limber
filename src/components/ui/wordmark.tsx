import Link from "next/link";

export function Wordmark({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-xl font-bold tracking-tight ${
        light ? "text-white" : "text-brand-800"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
          light ? "bg-card text-brand-700" : "bg-brand-600 text-white"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      Limber
    </Link>
  );
}
