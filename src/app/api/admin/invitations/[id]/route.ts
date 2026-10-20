import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { getAdminSession } from "@/lib/admin";
import { isUuid } from "@/lib/chat";

// DELETE /api/admin/invitations/[id] — revoke an outstanding invite.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const revoked = await db
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invitations.id, id),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt)
      )
    )
    .returning({ id: invitations.id });
  if (revoked.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
