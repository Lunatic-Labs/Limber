import { and, asc, desc, eq, gt, or } from "drizzle-orm";
import { db } from "@/db";
import { messages, plansOfCare } from "@/db/schema";
import type { ChatMessage } from "./chat-shared";

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

export function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderUserId: row.senderUserId,
    body: row.body ?? "",
    createdAt: row.createdAt.toISOString(),
  };
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

  return rows.reverse().map(toChatMessage);
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

  return rows.map(toChatMessage);
}
