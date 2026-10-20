"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/wordmark";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/sign-out-button";

export type NavItem = { label: string; href: string };

// Signed-in layout: left sidebar on desktop, slide-in drawer on phones.
export function AppShell({
  nav,
  userName,
  roleLabel,
  homeHref,
  children,
}: {
  nav: NavItem[];
  userName: string;
  roleLabel: string;
  homeHref: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const sidebar = (
    <div className="flex h-full flex-col bg-card">
      <div className="px-5 py-5">
        <Wordmark href={homeHref} />
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center rounded-lg px-3 text-base font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-ink-muted hover:bg-brand-50 hover:text-brand-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-brand-100 p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar name={userName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{userName}</p>
            <p className="text-xs text-ink-muted">{roleLabel}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-brand-100 lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-brand-100 bg-card px-4 py-2 lg:hidden">
        <Wordmark href={homeHref} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-800 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute inset-y-0 right-0 w-72 max-w-[85%] shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  );
}
