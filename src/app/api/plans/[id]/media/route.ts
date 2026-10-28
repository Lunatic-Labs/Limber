import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlanForUser } from "@/lib/chat";
import { getMediaPage } from "@/lib/media";
import { decodeCursor, parseDetailsTab, parseLimit } from "@/lib/media-shared";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/plans/:id/media?tab=media|documents&before=<cursor>&limit=<n>
// Returns 404 (not 403) for a plan the caller isn't part of, like the
// other plan routes.
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

  const query = new URL(req.url).searchParams;
  const tab = parseDetailsTab(query.get("tab"));
  if (tab === "info") {
    return NextResponse.json({ error: "Invalid 'tab'" }, { status: 400 });
  }

  const before = query.get("before");
  const cursor = decodeCursor(before);
  if (before && !cursor) {
    return NextResponse.json({ error: "Invalid 'before'" }, { status: 400 });
  }

  const page = await getMediaPage(
    plan.id,
    tab,
    parseLimit(query.get("limit") ?? undefined),
    cursor
  );
  return NextResponse.json(page);
}
