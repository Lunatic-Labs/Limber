"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type PusherClient from "pusher-js";
import { upload } from "@vercel/blob/client";
import {
  FILE_INPUT_ACCEPT,
  MAX_ATTACHMENTS_PER_MESSAGE,
  attachmentPathPrefix,
  validateFileForUpload,
} from "@/lib/attachments-shared";
import {
  MESSAGE_MAX_LENGTH,
  NEW_MESSAGE_EVENT,
  planChannelName,
  type ChatAttachment,
  type ChatMessage,
} from "@/lib/chat-shared";

// A message the user just sent that the server hasn't confirmed yet
// (or that failed to send). Real messages never have `status`; local
// ones may carry `blobUrl`s on their attachments for sending/retry.

// A file the user picked that is uploading to Blob (or failed to).
// Once `attachment` is set it's ready to be sent with the message.
type PendingFile = {
  key: string;
  name: string;
  progress: number; // 0-100
  error?: string;
  attachment?: UploadedAttachment;
};

// An attachment that's been uploaded but not yet sent. `url` is a local
// object URL (so it can be previewed immediately); `blobUrl` is what
// the server needs. The private Blob URL itself can't be opened by a
// browser, so it is never used for display.
type UploadedAttachment = ChatAttachment & { blobUrl: string };

// A message the user just sent that the server hasn't confirmed yet
// (or that failed to send). Real messages never have `status`. Its
// attachments keep their `blobUrl` so a failed send can be retried.
type LocalMessage = Omit<ChatMessage, "attachments"> & {
  attachments: (ChatAttachment & { blobUrl?: string })[];
  status?: "sending" | "failed";
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 100) || "file";
}

function AttachmentView({ a }: { a: ChatAttachment }) {
  // Browsers other than Safari can't show HEIC, so a failed image or
  // video falls back to a plain download link.
  const [broken, setBroken] = useState(false);

  if (a.kind === "photo" && !broken) {
    return (
      <a href={a.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.url}
          alt={a.fileName}
          loading="lazy"
          onError={() => setBroken(true)}
          className="max-h-72 max-w-full rounded-lg object-cover"
        />
      </a>
    );
  }
  if (a.kind === "video" && !broken) {
    return (
      <video
        src={a.url}
        controls
        playsInline
        preload="metadata"
        aria-label={a.fileName}
        onError={() => setBroken(true)}
        className="max-h-72 max-w-full rounded-lg bg-black"
      />
    );
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      download={a.fileName}
      className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
    >
      <span aria-hidden="true">📄</span>
      <span className="min-w-0">
        <span className="block truncate">{a.fileName}</span>
        <span className="block text-xs text-gray-500">{formatSize(a.size)}</span>
      </span>
    </a>
  );
}

type Props = {
  planOfCareId: string;
  planTitle: string;
  currentUserId: string;
  otherName: string;
  initialMessages: ChatMessage[];
  backHref: string;
};

// Show a centered timestamp when there's a gap this long between messages.
const STAMP_GAP_MS = 30 * 60 * 1000;
const POLL_INTERVAL_MS = 4000;

function merge(prev: LocalMessage[], incoming: ChatMessage[]): LocalMessage[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()];
}

function time(iso: string) {
  return new Date(iso).getTime();
}

function formatStamp(iso: string): { day: string; clock: string } {
  const d = new Date(iso);
  const now = new Date();
  const clock = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const daysAgo = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);

  if (daysAgo === 0) return { day: "Today", clock };
  if (daysAgo === 1) return { day: "Yesterday", clock };
  if (daysAgo > 1 && daysAgo < 7) {
    return { day: d.toLocaleDateString([], { weekday: "long" }), clock };
  }
  return {
    day: d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
    }),
    clock,
  };
}

export function ChatView({
  planOfCareId,
  planTitle,
  currentUserId,
  otherName,
  initialMessages,
  backHref,
}: Props) {
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  // Timestamps depend on the viewer's timezone/clock, so they're only
  // rendered after mount to avoid a server/client hydration mismatch.
  const [mounted, setMounted] = useState(false);
  // Poll for new messages when realtime (Pusher) isn't available.
  const [polling, setPolling] = useState(!process.env.NEXT_PUBLIC_PUSHER_KEY);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const stickToBottom = useRef(true);
  const pusherRef = useRef<PusherClient | null>(null);
  const latestConfirmed = useRef("");
  const tmpCounter = useRef(0);

  useEffect(() => setMounted(true), []);

  // Real messages in time order, then unsent/failed ones at the end.
  const ordered = useMemo(() => {
    const confirmed = messages
      .filter((m) => !m.status)
      .sort((a, b) => time(a.createdAt) - time(b.createdAt));
    const pending = messages.filter((m) => m.status);
    return [...confirmed, ...pending];
  }, [messages]);

  useEffect(() => {
    const confirmed = ordered.filter((m) => !m.status);
    latestConfirmed.current = confirmed.at(-1)?.createdAt ?? "";
  }, [ordered]);

  // Fetch anything newer than what we have.
  const catchUp = useCallback(async () => {
    try {
      const after = latestConfirmed.current;
      const url =
        `/api/plans/${planOfCareId}/messages` +
        (after ? `?after=${encodeURIComponent(after)}` : "");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data: { messages: ChatMessage[] } = await res.json();
      if (data.messages.length) {
        setMessages((prev) => merge(prev, data.messages));
      }
    } catch {
      // Network blip; the next poll/event will catch up.
    }
  }, [planOfCareId]);

  // Realtime via Pusher (private channel, authorized by /api/pusher/auth).
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    let cancelled = false;
    let cleanup = () => {};

    import("pusher-js").then(({ default: Pusher }) => {
      if (cancelled) return;
      const client = new Pusher(key, {
        cluster,
        channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" },
      });
      pusherRef.current = client;

      const channelName = planChannelName(planOfCareId);
      const channel = client.subscribe(channelName);
      channel.bind(NEW_MESSAGE_EVENT, (m: ChatMessage) =>
        setMessages((prev) => merge(prev, [m]))
      );
      channel.bind("pusher:subscription_succeeded", () => {
        setPolling(false);
        catchUp(); // cover anything sent before we subscribed
      });
      channel.bind("pusher:subscription_error", () => setPolling(true));

      cleanup = () => {
        channel.unbind_all();
        client.unsubscribe(channelName);
        client.disconnect();
        pusherRef.current = null;
      };
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [planOfCareId, catchUp]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(catchUp, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [polling, catchUp]);

  // Keep the view pinned to the newest message unless the user scrolled up.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [ordered.length]);

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // Grow the composer with its content (up to ~6 lines).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [draft]);

  const send = useCallback(
    async (
      text: string,
      attachments: (ChatAttachment & { blobUrl?: string })[],
      retryId?: string
    ) => {
      const tmpId = retryId ?? `tmp-${Date.now()}-${tmpCounter.current++}`;
      stickToBottom.current = true;

      setMessages((prev) =>
        retryId
          ? prev.map((m) =>
              m.id === tmpId ? { ...m, status: "sending" as const } : m
            )
          : [
              ...prev,
              {
                id: tmpId,
                senderUserId: currentUserId,
                body: text,
                attachments,
                createdAt: new Date().toISOString(),
                status: "sending" as const,
              },
            ]
      );

      try {
        const socketId = pusherRef.current?.connection.socket_id;
        const res = await fetch(`/api/plans/${planOfCareId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(socketId ? { "X-Pusher-Socket-Id": socketId } : {}),
          },
          body: JSON.stringify({
            body: text,
            attachments: attachments.map((a) => ({
              url: a.blobUrl,
              fileName: a.fileName,
              mimeType: a.mimeType,
              size: a.size,
            })),
          }),
        });
        if (!res.ok) throw new Error("send failed");
        const data: { message: ChatMessage } = await res.json();
        setMessages((prev) =>
          merge(
            prev.filter((m) => m.id !== tmpId),
            [data.message]
          )
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tmpId ? { ...m, status: "failed" as const } : m
          )
        );
      }
    },
    [currentUserId, planOfCareId]
  );

  const uploading = files.some((f) => !f.attachment && !f.error);
  const readyFiles = files.flatMap((f) => (f.attachment ? [f.attachment] : []));
  const canSend =
    !uploading && (draft.trim().length > 0 || readyFiles.length > 0);

  function updateFile(key: string, patch: Partial<PendingFile>) {
    setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  // Upload straight to Vercel Blob (the API route only hands out a
  // token), so large videos never pass through a serverless function.
  async function uploadFile(key: string, file: File) {
    try {
      const blob = await upload(
        `${attachmentPathPrefix(planOfCareId)}${safeFileName(file.name)}`,
        file,
        {
          access: "private",
          handleUploadUrl: `/api/plans/${planOfCareId}/attachments`,
          multipart: file.size > 20 * 1024 * 1024,
          contentType: file.type,
          onUploadProgress: ({ percentage }) =>
            updateFile(key, { progress: Math.round(percentage) }),
        }
      );
      const kind = validateFileForUpload(file);
      if (!kind.ok) throw new Error(kind.error);
      updateFile(key, {
        progress: 100,
        attachment: {
          id: blob.url,
          kind: kind.value,
          url: URL.createObjectURL(file),
          blobUrl: blob.url,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });
    } catch {
      updateFile(key, { error: "Upload failed" });
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setAttachError(null);
    let room = MAX_ATTACHMENTS_PER_MESSAGE - files.length;
    const problems: string[] = [];

    for (const file of Array.from(list)) {
      if (room <= 0) {
        problems.push(
          `You can attach up to ${MAX_ATTACHMENTS_PER_MESSAGE} files per message.`
        );
        break;
      }
      const check = validateFileForUpload(file);
      if (!check.ok) {
        problems.push(`${file.name}: ${check.error}`);
        continue;
      }
      room--;
      const key = `file-${Date.now()}-${tmpCounter.current++}`;
      setFiles((prev) => [...prev, { key, name: file.name, progress: 0 }]);
      void uploadFile(key, file);
    }
    if (problems.length) setAttachError(problems.join(" "));
  }

  function submit() {
    if (!canSend) return;
    const text = draft.trim();
    const attachments = readyFiles;
    setDraft("");
    setFiles((prev) => prev.filter((f) => f.error)); // keep failed ones visible
    setAttachError(null);
    void send(text, attachments);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem)] min-h-[420px] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-200 bg-gray-50 px-3 py-2">
        <Link
          href={backHref}
          className="justify-self-start rounded px-1 text-sm text-gray-600 hover:text-gray-900"
        >
          &lsaquo; Back
        </Link>
        <div className="text-center">
          <p className="text-sm font-semibold leading-tight">{otherName}</p>
          <p className="text-xs leading-tight text-gray-500">{planTitle}</p>
        </div>
        <span />
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label={`Conversation with ${otherName}`}
        className="flex-1 overflow-y-auto px-3 py-4"
      >
        {ordered.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-500">
            No messages yet. Say hello to {otherName}.
          </p>
        )}

        {ordered.map((m, i) => {
          const prev = ordered[i - 1];
          const next = ordered[i + 1];
          const mine = m.senderUserId === currentUserId;
          const showStamp =
            !prev || time(m.createdAt) - time(prev.createdAt) > STAMP_GAP_MS;
          const startsGroup =
            showStamp || prev.senderUserId !== m.senderUserId;
          const endsGroup =
            !next ||
            next.senderUserId !== m.senderUserId ||
            time(next.createdAt) - time(m.createdAt) > STAMP_GAP_MS;
          const stamp = showStamp && mounted ? formatStamp(m.createdAt) : null;

          return (
            <div key={m.id}>
              {stamp && (
                <p className="my-3 text-center text-xs text-gray-500">
                  <span className="font-semibold">{stamp.day}</span>{" "}
                  {stamp.clock}
                </p>
              )}
              <div
                className={`flex flex-col ${mine ? "items-end" : "items-start"} ${
                  startsGroup ? "mt-2" : "mt-0.5"
                }`}
              >
                {m.attachments.length > 0 && (
                  <div
                    className={`flex max-w-[75%] flex-col gap-1 ${
                      mine ? "items-end" : "items-start"
                    } ${m.status ? "opacity-70" : ""}`}
                  >
                    {m.attachments.map((a) => (
                      <AttachmentView key={a.id} a={a} />
                    ))}
                  </div>
                )}
                {m.body && (
                <div
                  className={[
                    "max-w-[75%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[15px] leading-snug",
                    m.attachments.length > 0 ? "mt-1" : "",
                    mine
                      ? "bg-gray-500 text-white"
                      : "bg-gray-200 text-gray-900",
                    endsGroup ? (mine ? "rounded-br-sm" : "rounded-bl-sm") : "",
                    m.status === "sending" ? "opacity-70" : "",
                    m.status === "failed" ? "opacity-60" : "",
                  ].join(" ")}
                >
                  {m.body}
                </div>
                )}
                {m.status === "failed" && (
                  <button
                    type="button"
                    onClick={() => void send(m.body, m.attachments, m.id)}
                    className="mt-1 text-xs text-red-600 hover:underline"
                  >
                    Not delivered. Tap to retry.
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 bg-gray-50 p-3">
        {(files.length > 0 || attachError) && (
          <div className="mb-2 space-y-1">
            {files.map((f) => (
              <div
                key={f.key}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
              >
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className={f.error ? "text-red-600" : "text-gray-500"}>
                  {f.error ?? (f.attachment ? "Ready" : `${f.progress}%`)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setFiles((prev) => prev.filter((x) => x.key !== f.key))
                  }
                  aria-label={`Remove ${f.name}`}
                  className="px-1 text-gray-500 hover:text-gray-900"
                >
                  &times;
                </button>
              </div>
            ))}
            {attachError && (
              <p role="alert" className="text-xs text-red-600">
                {attachError}
              </p>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = ""; // allow re-picking the same file
            }}
          />
          {/* On phones, `capture` opens the camera to take a photo/video. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach a file"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 11.5l-8.6 8.6a5 5 0 01-7.1-7.1l8.6-8.6a3.4 3.4 0 014.8 4.8l-8.6 8.6a1.7 1.7 0 01-2.4-2.4l7.9-7.9" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            aria-label="Take a photo or video"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder="Message"
            aria-label="Message"
            className="max-h-36 min-h-[40px] flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-[15px] leading-snug outline-none focus:border-gray-500"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-500 text-white transition-colors hover:bg-gray-600 disabled:bg-gray-300"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
