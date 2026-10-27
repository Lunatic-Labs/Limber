import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getPlanForUser } from "@/lib/chat";
import { canArchivePlan, canEditPlan } from "@/lib/plans-shared";
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
import { ArchivePlanButton } from "./archive-plan-button";
import { PLAN_EDIT_FORM_ID, PlanEditForm } from "./plan-edit-form";

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
  edit: rawEdit,
}: {
  planId: string;
  chatHref: string;
  tab: unknown;
  edit?: unknown;
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

  const [people, details, initialPage] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.id, [plan.patientUserId, plan.physicianUserId])),
    getPlanDetails(plan.id),
    getMediaPage(plan.id, tab, DEFAULT_MEDIA_PAGE_SIZE, null),
  ]);
  if (!details) notFound();

  const isPlanPhysician =
    session.user.role === "physician" &&
    plan.physicianUserId === session.user.id;
  const canEdit = isPlanPhysician && canEditPlan(details.status);
  const canArchive = isPlanPhysician && canArchivePlan(details.status);

  const nameOf = (id: string) => {
    const u = people.find((p) => p.id === id);
    return u?.name ?? u?.username ?? "Unknown";
  };
  const other = people.find((p) => p.id === otherUserId);
  const otherName = nameOf(otherUserId);
  const detailsPath = `${chatHref}/conversation`;
  const infoHref = `${detailsPath}?tab=info`;
  const editing = canEdit && tab === "info" && rawEdit === "1";

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-brand-100 bg-card shadow-sm">
      <div className="bg-brand-50 px-3 pb-3 pt-1.5">
        <div className="flex items-center justify-between">
          <Link
            href={editing ? infoHref : chatHref}
            aria-label={editing ? "Cancel editing" : "Back to chat"}
            className="-ml-1 flex h-11 w-11 items-center justify-center rounded-full text-brand-700 transition-colors duration-fast hover:bg-brand-100 hover:text-brand-900 active:bg-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </Link>
          {editing ? (
            <div className="flex items-center">
              <Link
                href={infoHref}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-medium text-brand-800 transition duration-fast hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                form={PLAN_EDIT_FORM_ID}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-semibold text-brand-800 transition duration-fast hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Save
              </button>
            </div>
          ) : (
            canEdit &&
            tab === "info" && (
              <Link
                href={`${infoHref}&edit=1`}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-semibold text-brand-800 transition duration-fast hover:bg-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Edit
              </Link>
            )
          )}
        </div>
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
          editing ? (
            <div className="p-4">
              <PlanEditForm
                planId={plan.id}
                infoHref={infoHref}
                initial={{
                  title: details.title,
                  diagnosis: details.diagnosis ?? "",
                  description: details.description ?? "",
                  startDate: details.startDate.toISOString().slice(0, 10),
                }}
              />
            </div>
          ) : (
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
                {details.diagnosis && (
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Diagnosis: </span>
                    {details.diagnosis}
                  </p>
                )}
                <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-800">
                  {details.description?.trim() || "No details added yet."}
                </p>
              </section>

              <section aria-labelledby="team-heading">
                <h2 id="team-heading" className="text-sm font-semibold">
                  Care team
                </h2>
                <dl className="mt-1 space-y-0.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-20 text-gray-600">Patient</dt>
                    <dd>{nameOf(plan.patientUserId)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 text-gray-600">Physician</dt>
                    <dd>{nameOf(plan.physicianUserId)}</dd>
                  </div>
                </dl>
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

              {canArchive && (
                <section className="border-t border-brand-100 pt-5">
                  <ArchivePlanButton planId={plan.id} />
                </section>
              )}
            </div>
          )
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
