"use client";

import { useEffect, useState } from "react";
import { MediaViewer } from "./media-viewer";
import { formatDuration, senderLabel, type MediaItem, type MediaPage } from "@/lib/media-shared";

type Props = {
  planOfCareId: string;
  tab: "media" | "documents";
  initialPage: MediaPage;
  currentUserId: string;
  otherName: string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const dayFormat = { month: "short", day: "numeric", year: "numeric" } as const;

function MediaTile({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  // Browsers other than Safari can't show HEIC, so a failed image or
  // video falls back to a file tile.
  const [broken, setBroken] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const label = formatDuration(duration);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${item.kind === "video" ? "Video" : "Photo"}: ${item.fileName}`}
      className="relative aspect-square overflow-hidden bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
    >
      {broken ? (
        <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-xs text-gray-600">
          <span aria-hidden="true" className="text-xl">📄</span>
          <span className="line-clamp-2 break-all">{item.fileName}</span>
        </span>
      ) : item.kind === "video" ? (
        <video
          src={`${item.url}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
        />
      )}
      {item.kind === "video" && !broken && (
        <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          {label}
        </span>
      )}
    </button>
  );
}

export function MediaBrowser({ planOfCareId, tab, initialPage, currentUserId, otherName }: Props) {
  const [items, setItems] = useState(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // Dates render in UTC on the server and switch to the viewer's local
  // time after mount, to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const day = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      ...dayFormat,
      ...(mounted ? {} : { timeZone: "UTC" }),
    });
  const sender = (item: MediaItem) =>
    senderLabel({ senderUserId: item.senderUserId, currentUserId, otherName });
  const describe = (item: MediaItem) => `${sender(item)} · ${day(item.createdAt)}`;

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/plans/${planOfCareId}/media?tab=${tab}&before=${encodeURIComponent(nextCursor)}`
      );
      if (!res.ok) throw new Error();
      const page: MediaPage = await res.json();
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      setError("Couldn't load more. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-gray-500">
        {tab === "media" ? "No photos or videos yet." : "No documents yet."}
      </p>
    );
  }

  return (
    <div>
      {tab === "media" ? (
        <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4">
          {items.map((item, i) => (
            <MediaTile key={item.id} item={item} onOpen={() => setViewerIndex(i)} />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-brand-100">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                download={item.fileName}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
              >
                <span aria-hidden="true" className="text-xl">📄</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-gray-900">{item.fileName}</span>
                  <span className="block truncate text-xs text-gray-500">
                    {formatSize(item.size)} · {sender(item)} · {day(item.createdAt)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {(nextCursor || error) && (
        <div className="p-4 text-center">
          {error && (
            <p role="alert" className="mb-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="rounded-full border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {tab === "media" && viewerIndex !== null && (
        <MediaViewer
          items={items}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          describe={describe}
        />
      )}
    </div>
  );
}
