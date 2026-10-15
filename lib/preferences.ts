import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPreferences } from "@/db/schema";
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  type Preferences,
} from "@/lib/preferences-shared";

// Missing row (or a row that somehow fails validation) = defaults.
export async function getPreferences(userId: string): Promise<Preferences> {
  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  if (!row) return DEFAULT_PREFERENCES;
  const parsed = parsePreferences({
    textSize: row.textSize,
    theme: row.theme,
    contrast: row.contrast,
    reducedMotion: row.reducedMotion,
    largeTouchTargets: row.largeTouchTargets,
    simplifiedLayout: row.simplifiedLayout,
    dyslexiaFont: row.dyslexiaFont,
    boldText: row.boldText,
    messageDensity: row.messageDensity,
    confirmBeforeSend: row.confirmBeforeSend,
    announceNewMessages: row.announceNewMessages,
  });
  return parsed.ok ? parsed.value : DEFAULT_PREFERENCES;
}

// Upsert. Also the entry point the future admin onboarding flow should
// call to persist an invitee's initial preferences (see constitution.md).
export async function savePreferences(
  userId: string,
  prefs: Preferences,
): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId, ...prefs })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...prefs, updatedAt: new Date() },
    });
}
