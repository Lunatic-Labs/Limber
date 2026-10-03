import Pusher from "pusher";

let client: Pusher | null | undefined;

// Returns null when Pusher env vars aren't configured, so chat still
// works (the UI falls back to polling) instead of crashing.
export function getPusherServer(): Pusher | null {
  if (client !== undefined) return client;

  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } =
    process.env;

  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
    client = null;
    return client;
  }

  client = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER,
    useTLS: true,
  });
  return client;
}
