import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { getPlanForUser } from "@/lib/chat";
import {
  ALLOWED_MIME_TYPES,
  ATTACHMENT_LIMITS,
  attachmentPathPrefix,
} from "@/lib/attachments-shared";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/plans/:id/attachments
//
// Token endpoint for Vercel Blob client uploads. Files go from the
// browser straight to Blob (serverless request bodies are capped at
// ~4.5 MB, far too small for videos); this route only decides whether
// a token may be issued. Access is the same plan-membership check the
// rest of chat uses, and the token is locked to this plan's pathname
// prefix, the allowed content types and the largest size limit (the
// per-kind limit is enforced again on the client and when the message
// is posted).
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

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(attachmentPathPrefix(plan.id))) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: ALLOWED_MIME_TYPES,
          maximumSizeInBytes: Math.max(...Object.values(ATTACHMENT_LIMITS)),
          addRandomSuffix: true, // keeps URLs unguessable
        };
      },
      // Nothing to do on completion: the message POST records the
      // attachment. (This callback also can't fire on localhost.)
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Attachment upload token failed:", err);
    return NextResponse.json({ error: "Upload not allowed" }, { status: 400 });
  }
}
