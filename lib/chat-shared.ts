// Types and constants shared by the chat server code and the chat UI.
// Keep this file free of server-only imports (db, auth, pusher).

export const MESSAGE_MAX_LENGTH = 4000;
export const NEW_MESSAGE_EVENT = "message:new";

export type ChatMessage = {
  id: string;
  senderUserId: string;
  body: string;
  createdAt: string; // ISO 8601
};

// One private Pusher channel per Plan of Care.
export function planChannelName(planOfCareId: string): string {
  return `private-poc-${planOfCareId}`;
}

export function planIdFromChannelName(channelName: string): string | null {
  const prefix = "private-poc-";
  return channelName.startsWith(prefix) ? channelName.slice(prefix.length) : null;
}
