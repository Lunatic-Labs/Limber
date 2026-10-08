// Tracks browser object URLs (URL.createObjectURL) so they can be revoked
// once their preview is no longer needed. Each URL pins its File in memory
// until revoked, which matters for large videos.
//
// Entries are keyed by an owner (e.g. a composer file), and an owner must be
// `open`ed before a URL can be created for it. That way an upload finishing
// after the file was removed, or after unmount, never creates a leaked URL.
export type ObjectUrlApi = {
  create: (blob: Blob) => string;
  revoke: (url: string) => void;
};

const browserApi: ObjectUrlApi = {
  create: (blob) => URL.createObjectURL(blob),
  revoke: (url) => URL.revokeObjectURL(url),
};

export class ObjectUrlRegistry {
  private owners = new Map<string, string | null>();
  private disposed = false;

  constructor(private api: ObjectUrlApi = browserApi) {}

  /** Start tracking an owner; no-op if already open. */
  open(key: string): void {
    if (!this.disposed && !this.owners.has(key)) this.owners.set(key, null);
  }

  /** Create a URL for an open owner, or null if it was closed/disposed. */
  create(key: string, blob: Blob): string | null {
    if (this.disposed || !this.owners.has(key)) return null;
    const existing = this.owners.get(key);
    if (existing) this.api.revoke(existing);
    const url = this.api.create(blob);
    this.owners.set(key, url);
    return url;
  }

  /** Revoke an owner's URL (if any) and stop tracking it. Idempotent. */
  release(key: string): void {
    const url = this.owners.get(key);
    if (url) this.api.revoke(url);
    this.owners.delete(key);
  }

  /** Revoke by URL value, for when only the URL is at hand. Idempotent. */
  releaseUrl(url: string): void {
    for (const [key, value] of this.owners) {
      if (value === url) this.release(key);
    }
  }

  /** Revoke everything and refuse new URLs until `activate()`. */
  dispose(): void {
    for (const url of this.owners.values()) {
      if (url) this.api.revoke(url);
    }
    this.owners.clear();
    this.disposed = true;
  }

  /** Re-enable after `dispose()` (React strict mode re-runs effects). */
  activate(): void {
    this.disposed = false;
  }

  get size(): number {
    return this.owners.size;
  }
}
