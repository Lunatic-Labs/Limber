import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  preferencesToDataAttributes,
  serializePreferencesCookie,
  parsePreferencesCookie,
} from "../lib/preferences-shared";

test("defaults: system theme, default size, announcements on", () => {
  assert.equal(DEFAULT_PREFERENCES.theme, "system");
  assert.equal(DEFAULT_PREFERENCES.textSize, "default");
  assert.equal(DEFAULT_PREFERENCES.announceNewMessages, true);
  assert.equal(DEFAULT_PREFERENCES.reducedMotion, false);
});

test("parsePreferences accepts a full valid object", () => {
  const input = { ...DEFAULT_PREFERENCES, textSize: "xlarge", theme: "dark" };
  const r = parsePreferences(input);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.value, input);
});

test("parsePreferences fills missing keys with defaults (partial update)", () => {
  const r = parsePreferences({ contrast: "high" });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.contrast, "high");
    assert.equal(r.value.theme, "system");
  }
});

test("parsePreferences merges partial input onto a base", () => {
  const base = { ...DEFAULT_PREFERENCES, textSize: "large" as const };
  const r = parsePreferences({ boldText: true }, base);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.textSize, "large");
    assert.equal(r.value.boldText, true);
  }
});

test("parsePreferences rejects bad enum values", () => {
  for (const bad of [{ textSize: "huge" }, { theme: "blue" }, { contrast: 1 }, { messageDensity: null }]) {
    assert.equal(parsePreferences(bad).ok, false, JSON.stringify(bad));
  }
});

test("parsePreferences rejects non-boolean flags", () => {
  assert.equal(parsePreferences({ reducedMotion: "yes" }).ok, false);
  assert.equal(parsePreferences({ boldText: 1 }).ok, false);
});

test("parsePreferences rejects non-objects", () => {
  for (const bad of [null, undefined, "x", 5, [], true]) {
    assert.equal(parsePreferences(bad).ok, false);
  }
});

test("parsePreferences rejects unknown keys", () => {
  assert.equal(parsePreferences({ role: "administrator" }).ok, false);
});

test("data attributes: defaults produce no overrides", () => {
  const a = preferencesToDataAttributes(DEFAULT_PREFERENCES);
  assert.equal(a["data-text-size"], "default");
  assert.equal(a["data-theme"], "system");
  assert.equal(a["data-contrast"], "standard");
  assert.equal(a["data-reduced-motion"], "false");
  assert.equal(a["data-large-targets"], "false");
});

test("data attributes reflect chosen preferences", () => {
  const a = preferencesToDataAttributes({
    ...DEFAULT_PREFERENCES,
    textSize: "large",
    theme: "dark",
    contrast: "high",
    reducedMotion: true,
    largeTouchTargets: true,
    simplifiedLayout: true,
    dyslexiaFont: true,
    boldText: true,
    messageDensity: "compact",
  });
  assert.deepEqual(a, {
    "data-text-size": "large",
    "data-theme": "dark",
    "data-contrast": "high",
    "data-reduced-motion": "true",
    "data-large-targets": "true",
    "data-simplified": "true",
    "data-dyslexia-font": "true",
    "data-bold-text": "true",
    "data-density": "compact",
  });
});

test("cookie round-trips preferences", () => {
  const prefs = { ...DEFAULT_PREFERENCES, theme: "dark" as const, textSize: "xlarge" as const };
  const parsed = parsePreferencesCookie(serializePreferencesCookie(prefs));
  assert.deepEqual(parsed, prefs);
});

test("cookie parsing falls back to defaults on garbage", () => {
  for (const bad of [undefined, "", "not json", "%7B%22theme%22%3A%22neon%22%7D"]) {
    assert.deepEqual(parsePreferencesCookie(bad), DEFAULT_PREFERENCES);
  }
});
