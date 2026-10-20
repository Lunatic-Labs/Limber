import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPreferences, savePreferences } from "@/lib/preferences";
import {
  PREFERENCES_COOKIE,
  parsePreferences,
} from "@/lib/preferences-shared";

// Users can only ever read/write their own preferences: the target
// user is always the session user, never taken from the request.

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getPreferences(session.user.id));
}

// PUT accepts a full or partial preferences object; omitted keys keep
// their current value.
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await getPreferences(session.user.id);
  const parsed = parsePreferences(body, current);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await savePreferences(session.user.id, parsed.value);

  const res = NextResponse.json(parsed.value);
  // Clear the legacy signed-out mirror cookie; it is no longer used.
  res.cookies.delete(PREFERENCES_COOKIE);
  return res;
}
