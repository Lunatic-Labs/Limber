"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/media-shared";

type Props = {
  items: MediaItem[]; // photos and videos only
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  describe: (item: MediaItem) => string; // "You · Oct 27, 2026"
};

const SWIPE_PX = 50;

// Full-screen photo/video viewer. A native <dialog> gives us the focus
// trap, Esc to close and focus restore for free.
export function MediaViewer({ items, index, onIndexChange, onClose, describe }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const item = items[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  function handleKeyDown(e: React.KeyboardEvent) {
    // Arrow keys seek inside the video's native controls; don't hijack them.
    if (e.target instanceof HTMLVideoElement) return;
    if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
    if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const dx = e.changedTouches[0].clientX - start;
    if (dx > SWIPE_PX && hasPrev) onIndexChange(index - 1);
    if (dx < -SWIPE_PX && hasNext) onIndexChange(index + 1);
  }

  if (!item) return null;
  const failed = broken === item.id;
  const nav =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      aria-label={`${item.fileName}, ${index + 1} of ${items.length}`}
      className="m-0 h-full max-h-none w-full max-w-none bg-black p-0 text-white backdrop:bg-black"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold">{describe(item)}</p>
            <p className="truncate text-xs text-white/70">
              {index + 1} of {items.length}
            </p>
          </div>
          <a
            href={item.url}
            download={item.fileName}
            aria-label={`Download ${item.fileName}`}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
            </svg>
          </a>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4"
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={handleTouchEnd}
        >
          {failed ? (
            <a
              href={item.url}
              download={item.fileName}
              className="rounded-lg border border-white/30 px-4 py-3 text-sm underline"
            >
              Can&apos;t preview this file. Download {item.fileName}
            </a>
          ) : item.kind === "video" ? (
            <video
              key={item.id}
              src={item.url}
              controls
              playsInline
              autoPlay
              aria-label={item.fileName}
              onError={() => setBroken(item.id)}
              className="max-h-full max-w-full"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt={item.fileName}
              onError={() => setBroken(item.id)}
              className="max-h-full max-w-full object-contain"
            />
          )}

          {hasPrev && (
            <button type="button" aria-label="Previous" onClick={() => onIndexChange(index - 1)} className={`${nav} left-3`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          )}
          {hasNext && (
            <button type="button" aria-label="Next" onClick={() => onIndexChange(index + 1)} className={`${nav} right-3`}>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
