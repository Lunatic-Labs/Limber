import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { attachments, messages, plansOfCare } from "@/db/schema";
import { attachmentDownloadPath } from "./attachments-shared";
import {
  buildPage,
  kindsForTab,
  type DetailsTab,
  type MediaCursor,
  type MediaPage,
} from "./media-shared";

// Postgres stores microseconds but cursors carry milliseconds (a JS
// Date), so ordering and comparing on the truncated value keeps paging
// consistent at page boundaries.
const createdMs = sql`date_trunc('milliseconds', ${attachments.createdAt})`;

// One page of a plan's files for a tab, newest first. The caller must
// already have checked access with `getPlanForUser`.
export async function getMediaPage(
  planId: string,
  tab: DetailsTab,
  limit: number,
  cursor: MediaCursor | null
): Promise<MediaPage> {
  const kinds = kindsForTab(tab);
  if (kinds.length === 0) return { items: [], nextCursor: null };

  const rows = await db
    .select({
      id: attachments.id,
      kind: attachments.kind,
      fileName: attachments.fileName,
      mimeType: attachments.mimeType,
      size: attachments.fileSizeBytes,
      createdAt: attachments.createdAt,
      senderUserId: messages.senderUserId,
    })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .where(
      and(
        eq(messages.planOfCareId, planId),
        inArray(attachments.kind, kinds),
        cursor
          ? or(
              sql`${createdMs} < ${cursor.createdAt}::timestamp`,
              and(
                sql`${createdMs} = ${cursor.createdAt}::timestamp`,
                sql`${attachments.id} < ${cursor.id}`
              )
            )
          : undefined
      )
    )
    .orderBy(desc(createdMs), desc(attachments.id))
    .limit(limit + 1);

  return buildPage(
    rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      url: attachmentDownloadPath(planId, r.id),
      fileName: r.fileName,
      mimeType: r.mimeType,
      size: r.size,
      senderUserId: r.senderUserId,
      createdAt: r.createdAt.toISOString(),
    })),
    limit
  );
}

// Plan fields shown on the Info tab.
export async function getPlanDetails(planId: string) {
  const [plan] = await db
    .select({
      title: plansOfCare.title,
      diagnosis: plansOfCare.diagnosis,
      description: plansOfCare.description,
      status: plansOfCare.status,
      startDate: plansOfCare.startDate,
      endDate: plansOfCare.endDate,
    })
    .from(plansOfCare)
    .where(eq(plansOfCare.id, planId))
    .limit(1);
  return plan ?? null;
}
