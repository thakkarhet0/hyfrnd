import { getDb } from '@/db/index';
import { app_prefs } from '@/db/schema';
import { type OnboardingStep, type ThemePreference } from '@/stores/app.store';
import { type LanguageCode } from '@/constants/languages';
import { eq } from 'drizzle-orm';

const VALID_THEMES = new Set<string>(['system', 'light', 'dark']);

const VALID_STEPS = new Set<string>([
  'language', 'welcome', 'battery', 'first_capture', 'contacts', 'notifications', 'complete',
]);

interface AppPrefsRow {
  language: LanguageCode;
  theme_preference: ThemePreference;
  onboarding_step: OnboardingStep | null;
  onboarding_complete: boolean;
  last_app_open: number | null;
  nudge_morning_hour: number;
  nudge_afternoon_hour: number;
  nudge_evening_hour: number;
  backup_enabled: boolean;
  last_backup_at: number | null;
  last_backup_error: string | null;
}

export async function getAppPrefs(): Promise<{ data: AppPrefsRow | null; error: string | null }> {
  try {
    const db = getDb();
    const rows = await db.select().from(app_prefs).where(eq(app_prefs.id, 1)).limit(1);
    if (rows.length === 0) return { data: null, error: null };
    const r = rows[0];
    const rawStep = r.onboarding_step;
    const step: OnboardingStep | null =
      rawStep !== null && VALID_STEPS.has(rawStep) ? (rawStep as OnboardingStep) : null;
    if (rawStep !== null && step === null) {
      console.warn('[app-prefs] unrecognised onboarding_step in DB:', rawStep);
    }
    const rawTheme = r.theme_preference;
    const theme: ThemePreference =
      rawTheme !== null && VALID_THEMES.has(rawTheme) ? (rawTheme as ThemePreference) : 'system';

    return {
      data: {
        language: (r.language as LanguageCode) ?? 'hi',
        theme_preference: theme,
        onboarding_step: step,
        onboarding_complete: r.onboarding_complete === 1,
        last_app_open: r.last_app_open ?? null,
        nudge_morning_hour: r.nudge_morning_hour ?? 8,
        nudge_afternoon_hour: r.nudge_afternoon_hour ?? 13,
        nudge_evening_hour: r.nudge_evening_hour ?? 21,
        backup_enabled: r.backup_enabled === 1,
        last_backup_at: r.last_backup_at ?? null,
        last_backup_error: r.last_backup_error ?? null,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

interface UpsertAppPrefsInput {
  language?: LanguageCode;
  theme_preference?: ThemePreference;
  onboarding_step?: OnboardingStep | null;
  onboarding_complete?: boolean;
  last_app_open?: number;
  nudge_morning_hour?: number;
  nudge_afternoon_hour?: number;
  nudge_evening_hour?: number;
  backup_enabled?: boolean;
  last_backup_at?: number | null;
  last_backup_error?: string | null;
}

export async function upsertAppPrefs(input: UpsertAppPrefsInput): Promise<{ error: string | null }> {
  try {
    const db = getDb();
    const existing = await db.select({ id: app_prefs.id }).from(app_prefs).where(eq(app_prefs.id, 1)).limit(1);

    const now = Date.now();

    if (existing.length > 0) {
      const patch: Record<string, unknown> = { updated_at: now };
      if (input.language !== undefined) patch.language = input.language;
      if (input.theme_preference !== undefined) patch.theme_preference = input.theme_preference;
      if (input.onboarding_step !== undefined) patch.onboarding_step = input.onboarding_step;
      if (input.onboarding_complete !== undefined) patch.onboarding_complete = input.onboarding_complete ? 1 : 0;
      if (input.last_app_open !== undefined) patch.last_app_open = input.last_app_open;
      if (input.nudge_morning_hour !== undefined) patch.nudge_morning_hour = input.nudge_morning_hour;
      if (input.nudge_afternoon_hour !== undefined) patch.nudge_afternoon_hour = input.nudge_afternoon_hour;
      if (input.nudge_evening_hour !== undefined) patch.nudge_evening_hour = input.nudge_evening_hour;
      if (input.backup_enabled !== undefined) patch.backup_enabled = input.backup_enabled ? 1 : 0;
      if ('last_backup_at' in input) patch.last_backup_at = input.last_backup_at ?? null;
      if ('last_backup_error' in input) patch.last_backup_error = input.last_backup_error ?? null;
      await db.update(app_prefs).set(patch).where(eq(app_prefs.id, 1));
    } else {
      await db.insert(app_prefs).values({
        id: 1,
        language: input.language ?? 'hi',
        theme_preference: input.theme_preference ?? 'system',
        onboarding_step: input.onboarding_step ?? null,
        onboarding_complete: input.onboarding_complete ? 1 : 0,
        nudge_morning_hour: input.nudge_morning_hour ?? 8,
        nudge_afternoon_hour: input.nudge_afternoon_hour ?? 13,
        nudge_evening_hour: input.nudge_evening_hour ?? 21,
        backup_enabled: input.backup_enabled ? 1 : 0,
        updated_at: now,
      });
    }
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}
