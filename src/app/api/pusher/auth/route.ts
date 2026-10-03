import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlanForUser } from "@/lib/chat";
import { planIdFromChannelName } from "@/lib/chat-shared";
import { getPusherServer } from "@/lib/pusher";

// Pusher calls this (via pusher-js) before letting a browser subscribe
// to a private channel. We only authorize a user for the channel of a
// Plan of Care they are the patient or physician on.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json(
      { error: "Realtime is not configured" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const socketId = form.get("socket_id");
  const channelName = form.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const planId = planIdFromChannelName(channelName);
  const plan = planId ? await getPlanForUser(planId, session.user.id) : null;
  if (!plan) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
}
