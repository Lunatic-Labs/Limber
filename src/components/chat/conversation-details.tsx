import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getPlanForUser } from "@/lib/chat";
import { getMediaPage, getPlanDetails } from "@/lib/media";
import {
  DEFAULT_MEDIA_PAGE_SIZE,
  formatPlanDateRange,
  parseDetailsTab,
  type DetailsTab,
} from "@/lib/media-shared";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { MediaBrowser } from "./media-browser";

const TABS: { id: DetailsTab; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "media", label: "Photos & Videos" },
  { id: "documents", label: "Documents" },
];

const ROLE_LABEL: Record<string, string> = {
  physician: "Physician",
  patient: "Patient",
  administrator: "Administrator",
};

// Server-side wrapper shared by the patient and physician details
// pages (the screen behind the name in the chat header). Verifies the
// signed-in user belongs to the plan before loading anything.
export async function ConversationDetails({
  planId,
  chatHref,
  tab: rawTab,
}: {
  planId: string;
  chatHref: string;
  tab: unknown;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plan = await getPlanForUser(planId, session.user.id);
  if (!plan) notFound();

  const tab = parseDetailsTab(rawTab);
  const otherUserId =
    plan.patientUserId === session.user.id
      ? plan.physicianUserId
      : plan.patientUserId;

  const [[other], details, initialPage] = await Promise.all([
    db
      .select({ name: users.name, username: users.username, role: users.role })
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1),
    getPlanDetails(plan.id),
    getMediaPage(plan.id, tab, DEFAULT_MEDIA_PAGE_SIZE, null),
  ]);
  if (!details) notFound();

  const otherName = other?.name ?? other?.username ?? "Unknown";
  const detailsPath = `${chatHref}/details`;

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-brand-100 bg-card shadow-sm">
      <div className="bg-brand-50 px-3 pb-3 pt-1.5">
        <Link
          href={chatHref}
          aria-label="Back to chat"
          className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full text-brand-700 transition-colors duration-fast hover:bg-brand-100 hover:text-brand-900 active:bg-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex flex-col items-center gap-1 pb-1 text-center">
          <span className="[&>span]:h-20 [&>span]:w-20 [&>span]:text-2xl">
            <Avatar name={otherName} />
          </span>
          <h1 className="text-xl font-semibold">{otherName}</h1>
          <p className="text-sm text-gray-600">
            {ROLE_LABEL[other?.role ?? ""] ?? "Care team"} · {details.title}
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Conversation details"
        className="flex gap-2 overflow-x-auto border-b border-brand-100 bg-brand-50 px-3 pb-3"
      >
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <Link
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls="details-panel"
              href={`${detailsPath}?tab=${t.id}`}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-fast focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                selected
                  ? "bg-brand-600 text-white"
                  : "text-brand-700 hover:bg-brand-100"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div id="details-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "info" ? (
          <div className="space-y-5 p-4">
            <section aria-labelledby="poc-heading">
              <div className="flex items-start justify-between gap-3">
                <h2 id="poc-heading" className="text-lg font-semibold">
                  {details.title}
                </h2>
                <StatusBadge status={details.status} />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {formatPlanDateRange(details.startDate, details.endDate)}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">
                {details.description?.trim() || "No details added yet."}
              </p>
            </section>

            <section aria-labelledby="progress-heading">
              <h2 id="progress-heading" className="text-sm font-semibold">
                Progress
              </h2>
              <div aria-hidden className="mt-2 h-2.5 w-full rounded-full bg-brand-100" />
              <p className="mt-1 text-xs text-gray-500">
                Progress tracking coming soon.
              </p>
            </section>
          </div>
        ) : (
          <MediaBrowser
            key={tab}
            planOfCareId={plan.id}
            tab={tab}
            initialPage={initialPage}
            currentUserId={session.user.id}
            otherName={otherName}
          />
        )}
      </div>
    </div>
  );
}
