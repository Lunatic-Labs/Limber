"use client";

import { useEffect, useRef, useState } from "react";
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
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [headerH, setHeaderH] = useState(0);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  // While open: Escape closes (focus returns to the menu button) and the
  // page behind doesn't scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // The top bar stays above the drawer (so the button can become an X);
  // the drawer starts right below it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const measure = () => {
      setHeaderH(el.offsetHeight);
      // Header is display:none at desktop width; an open drawer would
      // otherwise stay "open" (page inert, scroll locked) with no close button.
      if (el.offsetHeight === 0) setOpen(false);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderSidebar = (showWordmark: boolean) => (
    <div className="flex h-full flex-col bg-card">
      {showWordmark ? (
        <div className="px-5 py-5">
          <Wordmark href={homeHref} />
        </div>
      ) : (
        <div className="h-3" />
      )}
      <nav aria-label="Main" className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] items-center rounded-lg px-3 text-base font-medium transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
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
        {renderSidebar(true)}
      </aside>

      {/* Mobile top bar */}
      <header ref={headerRef} className="sticky top-0 z-50 flex items-center justify-between border-b border-brand-100 bg-card px-4 py-2 lg:hidden">
        <Wordmark href={homeHref} />
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-brand-800 transition-colors duration-fast hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path
              d="M4 6h16"
              className={`origin-center transition-transform duration-base ease-out ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
              style={{ transformBox: "fill-box" }}
            />
            <path
              d="M4 12h16"
              className={`origin-center transition-opacity duration-fast ${open ? "opacity-0" : ""}`}
            />
            <path
              d="M4 18h16"
              className={`origin-center transition-transform duration-base ease-out ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
              style={{ transformBox: "fill-box" }}
            />
          </svg>
        </button>
      </header>

      {/* Mobile drawer: always mounted so it can animate out; inert while closed. */}
      <div
        style={{ top: headerH }}
        className={`fixed inset-x-0 bottom-0 z-40 transition-[visibility] duration-base lg:hidden ${
          open ? "visible" : "invisible"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-base ease-out ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 right-0 w-72 max-w-[85%] shadow-xl transition-transform duration-base ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {renderSidebar(false)}
        </div>
      </div>

      <div inert={open} className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </div>
    </div>
  );
}
