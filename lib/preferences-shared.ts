// Accessibility preferences: types, defaults, validation, and the mapping
// to <html> data attributes. Pure (no DB / Next imports) so it is safe on
// server, client, and in node:test. The DB layer is lib/preferences.ts.

export const TEXT_SIZES = ["default", "large", "xlarge"] as const;
export const CONTRASTS = ["standard", "high"] as const;
export const DENSITIES = ["comfortable", "compact"] as const;

export type Preferences = {
  textSize: (typeof TEXT_SIZES)[number];
  contrast: (typeof CONTRASTS)[number];
  reducedMotion: boolean;
  largeTouchTargets: boolean;
  simplifiedLayout: boolean;
  dyslexiaFont: boolean;
  boldText: boolean;
  messageDensity: (typeof DENSITIES)[number];
  confirmBeforeSend: boolean;
  announceNewMessages: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  textSize: "default",
  contrast: "standard",
  reducedMotion: false,
  largeTouchTargets: false,
  simplifiedLayout: false,
  dyslexiaFont: false,
  boldText: false,
  messageDensity: "comfortable",
  confirmBeforeSend: false,
  announceNewMessages: true,
};

const ENUMS: Record<string, readonly string[]> = {
  textSize: TEXT_SIZES,
  contrast: CONTRASTS,
  messageDensity: DENSITIES,
};

const BOOLEANS = [
  "reducedMotion",
  "largeTouchTargets",
  "simplifiedLayout",
  "dyslexiaFont",
  "boldText",
  "confirmBeforeSend",
  "announceNewMessages",
] as const;

export type ParseResult =
  | { ok: true; value: Preferences }
  | { ok: false; error: string };

// Validates untrusted input. Missing keys are taken from `base`
// (defaults unless given), so partial updates work. Unknown keys and
// wrongly-typed values are rejected rather than silently dropped.
export function parsePreferences(
  input: unknown,
  base: Preferences = DEFAULT_PREFERENCES,
): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Preferences must be an object" };
  }
  const known = new Set<string>([...Object.keys(ENUMS), ...BOOLEANS]);
  const out: Record<string, unknown> = { ...base };

  for (const [key, val] of Object.entries(input)) {
    if (!known.has(key)) return { ok: false, error: `Unknown preference: ${key}` };
    if (key in ENUMS) {
      if (typeof val !== "string" || !ENUMS[key].includes(val)) {
        return { ok: false, error: `Invalid value for ${key}` };
      }
    } else if (typeof val !== "boolean") {
      return { ok: false, error: `${key} must be true or false` };
    }
    out[key] = val;
  }
  return { ok: true, value: out as Preferences };
}

// Attributes set on <html>; globals.css keys all styling off these.
export function preferencesToDataAttributes(p: Preferences) {
  return {
    "data-text-size": p.textSize,
    "data-contrast": p.contrast,
    "data-reduced-motion": String(p.reducedMotion),
    "data-large-targets": String(p.largeTouchTargets),
    "data-simplified": String(p.simplifiedLayout),
    "data-dyslexia-font": String(p.dyslexiaFont),
    "data-bold-text": String(p.boldText),
    "data-density": p.messageDensity,
  };
}

// A cookie mirror lets the signed-out login page and the first paint
// honor the user's choices without a DB read. The DB stays the source
// of truth; the cookie is refreshed whenever preferences are loaded/saved.
export const PREFERENCES_COOKIE = "limber-prefs";

export function serializePreferencesCookie(p: Preferences): string {
  return encodeURIComponent(JSON.stringify(p));
}

export function parsePreferencesCookie(raw: string | undefined): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const obj = JSON.parse(decodeURIComponent(raw));
    // Cookies written before themes were removed still carry a `theme` key.
    if (obj && typeof obj === "object") delete obj.theme;
    const r = parsePreferences(obj);
    return r.ok ? r.value : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
