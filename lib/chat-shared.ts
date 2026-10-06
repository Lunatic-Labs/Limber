// Types and constants shared by the chat server code and the chat UI.
// Keep this file free of server-only imports (db, auth, pusher).

import type { AttachmentKind } from "./attachments-shared";

export const MESSAGE_MAX_LENGTH = 4000;
export const NEW_MESSAGE_EVENT = "message:new";

export type ChatAttachment = {
  id: string;
  kind: AttachmentKind;
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type ChatMessage = {
  id: string;
  senderUserId: string;
  body: string; // may be "" for an attachment-only message
  attachments: ChatAttachment[];
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
