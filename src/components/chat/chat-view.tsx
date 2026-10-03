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
import {
  MESSAGE_MAX_LENGTH,
  NEW_MESSAGE_EVENT,
  planChannelName,
  type ChatMessage,
} from "@/lib/chat-shared";

// A message the user just sent that the server hasn't confirmed yet
// (or that failed to send). Real messages never have `status`.
type LocalMessage = ChatMessage & { status?: "sending" | "failed" };

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
  // Timestamps depend on the viewer's timezone/clock, so they're only
  // rendered after mount to avoid a server/client hydration mismatch.
  const [mounted, setMounted] = useState(false);
  // Poll for new messages when realtime (Pusher) isn't available.
  const [polling, setPolling] = useState(!process.env.NEXT_PUBLIC_PUSHER_KEY);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    async (text: string, retryId?: string) => {
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
          body: JSON.stringify({ body: text }),
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

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void send(text);
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
                <div
                  className={[
                    "max-w-[75%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-[15px] leading-snug",
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
                {m.status === "failed" && (
                  <button
                    type="button"
                    onClick={() => void send(m.body, m.id)}
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
      <div className="flex items-end gap-2 border-t border-gray-200 bg-gray-50 p-3">
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
          disabled={draft.trim().length === 0}
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
  );
}
