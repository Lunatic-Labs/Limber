import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { getAttachmentInPlan, getPlanForUser } from "@/lib/chat";
import { attachmentContentHeaders } from "@/lib/attachments-shared";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

// GET /api/plans/:id/attachments/:attachmentId
//
// The Blob store is private, so files can only be read with the
// server's token. This route is the only way a browser gets one: it
// checks the caller is the plan's patient or physician, then streams
// the file through. 404 (not 403) for anything the caller can't see.
export async function GET(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, attachmentId } = await params;
  const plan = await getPlanForUser(id, session.user.id);
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const attachment = await getAttachmentInPlan(plan.id, attachmentId);
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Forward Range so video seeking works (iOS Safari requires it).
  const range = req.headers.get("range");
  let result;
  try {
    result = await get(attachment.blobUrl, {
      access: "private",
      headers: range ? { Range: range } : undefined,
    });
  } catch (err) {
    console.error("Attachment fetch failed:", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 502 });
  }
  if (!result || !result.stream) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const headers = new Headers(attachmentContentHeaders(attachment));
  headers.set("Accept-Ranges", "bytes");
  const contentRange = result.headers.get("content-range");
  const contentLength = result.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  if (contentRange) headers.set("Content-Range", contentRange);

  return new Response(result.stream, {
    status: contentRange ? 206 : 200,
    headers,
  });
}
