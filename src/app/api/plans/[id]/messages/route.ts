import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { attachments, messages } from "@/db/schema";
import {
  getMessagesAfter,
  getPlanForUser,
  toChatMessage,
} from "@/lib/chat";
import {
  MESSAGE_MAX_LENGTH,
  NEW_MESSAGE_EVENT,
  planChannelName,
} from "@/lib/chat-shared";
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  validateAttachmentInput,
  type ValidAttachment,
} from "@/lib/attachments-shared";
import { getPusherServer } from "@/lib/pusher";

type Ctx = { params: Promise<{ id: string }> };

// Both handlers return 404 (not 403) for a plan the caller isn't part
// of, so the API doesn't reveal which plan IDs exist.

// GET /api/plans/:id/messages?after=<ISO timestamp>
export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await getPlanForUser(id, session.user.id);
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const afterParam = new URL(req.url).searchParams.get("after");
  const after = afterParam ? new Date(afterParam) : new Date(0);
  if (Number.isNaN(after.getTime())) {
    return NextResponse.json({ error: "Invalid 'after'" }, { status: 400 });
  }

  const newMessages = await getMessagesAfter(plan.id, after);
  return NextResponse.json({ messages: newMessages });
}

// POST /api/plans/:id/messages
//   { "body": "text", "attachments": [{ url, fileName, mimeType, size }] }
// Either a non-empty body or at least one attachment is required.
// Attachment files are uploaded to Vercel Blob first (see ../attachments).
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await getPlanForUser(id, session.user.id);
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let text: unknown;
  let rawAttachments: unknown;
  try {
    ({ body: text, attachments: rawAttachments } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (text === undefined || text === null) text = "";
  if (typeof text !== "string") {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  if (text.length > MESSAGE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MESSAGE_MAX_LENGTH} characters)` },
      { status: 400 }
    );
  }

  if (rawAttachments === undefined || rawAttachments === null) {
    rawAttachments = [];
  }
  if (
    !Array.isArray(rawAttachments) ||
    rawAttachments.length > MAX_ATTACHMENTS_PER_MESSAGE
  ) {
    return NextResponse.json(
      { error: `At most ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message` },
      { status: 400 }
    );
  }
  const files: ValidAttachment[] = [];
  for (const raw of rawAttachments) {
    const result = validateAttachmentInput(raw, plan.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    files.push(result.value);
  }

  if (text.trim().length === 0 && files.length === 0) {
    return NextResponse.json(
      { error: "Message can't be empty" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(messages)
    .values({
      planOfCareId: plan.id,
      senderUserId: session.user.id,
      body: text.trim() || null,
    })
    .returning();

  const savedFiles = files.length
    ? await db
        .insert(attachments)
        .values(
          files.map((f) => ({
            messageId: row.id,
            kind: f.kind,
            blobUrl: f.url,
            fileName: f.fileName,
            mimeType: f.mimeType,
            fileSizeBytes: f.size,
          }))
        )
        .returning()
    : [];

  const message = toChatMessage(row, savedFiles);

  // Broadcast to everyone subscribed to this plan's channel. The sender
  // is excluded (via their socket id) because they already have the
  // message from this response. A Pusher failure must not fail the
  // send: the message is saved and the other side's catch-up/polling
  // will pick it up.
  const pusher = getPusherServer();
  if (pusher) {
    try {
      const socketId = req.headers.get("x-pusher-socket-id") ?? undefined;
      await pusher.trigger(
        planChannelName(plan.id),
        NEW_MESSAGE_EVENT,
        message,
        socketId ? { socket_id: socketId } : {}
      );
    } catch (err) {
      console.error("Pusher trigger failed:", err);
    }
  }

  return NextResponse.json({ message }, { status: 201 });
}
