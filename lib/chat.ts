import { and, asc, desc, eq, gt, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { attachments, messages, plansOfCare } from "@/db/schema";
import { attachmentDownloadPath } from "./attachments-shared";
import type { ChatAttachment, ChatMessage } from "./chat-shared";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

// Returns the Plan of Care only if `userId` is its patient or its
// physician. This is the single access check for everything chat
// related (pages, API routes, and Pusher channel auth).
export async function getPlanForUser(planId: string, userId: string) {
  if (!isUuid(planId)) return null;

  const [plan] = await db
    .select({
      id: plansOfCare.id,
      title: plansOfCare.title,
      patientUserId: plansOfCare.patientUserId,
      physicianUserId: plansOfCare.physicianUserId,
    })
    .from(plansOfCare)
    .where(
      and(
        eq(plansOfCare.id, planId),
        or(
          eq(plansOfCare.patientUserId, userId),
          eq(plansOfCare.physicianUserId, userId)
        )
      )
    )
    .limit(1);

  return plan ?? null;
}

type MessageRow = typeof messages.$inferSelect;
type AttachmentRow = typeof attachments.$inferSelect;

// The Blob URL is never sent to the browser (the store is private);
// clients load files through the authenticated attachment route.
function toChatAttachment(
  row: AttachmentRow,
  planOfCareId: string
): ChatAttachment {
  return {
    id: row.id,
    kind: row.kind,
    url: attachmentDownloadPath(planOfCareId, row.id),
    fileName: row.fileName,
    mimeType: row.mimeType,
    size: row.fileSizeBytes,
  };
}

export function toChatMessage(
  row: MessageRow,
  messageAttachments: AttachmentRow[] = []
): ChatMessage {
  return {
    id: row.id,
    senderUserId: row.senderUserId,
    body: row.body ?? "",
    attachments: messageAttachments.map((a) =>
      toChatAttachment(a, row.planOfCareId)
    ),
    createdAt: row.createdAt.toISOString(),
  };
}

// One attachment, only if it belongs to a message in `planId`.
export async function getAttachmentInPlan(planId: string, attachmentId: string) {
  if (!isUuid(attachmentId)) return null;
  const [row] = await db
    .select({ attachment: attachments })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .where(
      and(eq(attachments.id, attachmentId), eq(messages.planOfCareId, planId))
    )
    .limit(1);
  return row?.attachment ?? null;
}

// Attaches each message's attachments (one extra query for the batch).
async function withAttachments(rows: MessageRow[]): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];
  const files = await db
    .select()
    .from(attachments)
    .where(
      inArray(
        attachments.messageId,
        rows.map((r) => r.id)
      )
    )
    .orderBy(asc(attachments.createdAt));

  const byMessage = new Map<string, AttachmentRow[]>();
  for (const f of files) {
    byMessage.set(f.messageId, [...(byMessage.get(f.messageId) ?? []), f]);
  }
  return rows.map((r) => toChatMessage(r, byMessage.get(r.id)));
}

// Most recent `limit` messages, oldest first.
export async function getRecentMessages(
  planId: string,
  limit = 200
): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.planOfCareId, planId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return withAttachments(rows.reverse());
}

// Messages strictly newer than `after`, oldest first (used for
// catch-up after subscribing and as the polling fallback).
export async function getMessagesAfter(
  planId: string,
  after: Date
): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.planOfCareId, planId), gt(messages.createdAt, after)))
    .orderBy(asc(messages.createdAt))
    .limit(200);

  return withAttachments(rows);
}
