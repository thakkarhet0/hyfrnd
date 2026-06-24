# Story 6.1: Notification Timing Configuration

Status: done

## Story

As a user,
I want to adjust when each daily nudge arrives,
So that the reminders fit my schedule rather than interrupting it.

## Acceptance Criteria

1. **Given** the settings tab is open, **When** the user views the screen, **Then** the notification timing section is visible with morning, afternoon, and evening time controls
2. **Given** the timing controls are shown, **Then** morning is constrained to 06:00–10:00 (default 08:00), afternoon to 11:00–15:00 (default 13:00), and evening to 19:00–23:00 (default 21:00)
3. **Given** the user changes one or more times and taps save, **Then** the existing daily nudge notifications are cancelled and rescheduled at the new times
4. **Given** the new times are saved, **Then** the new hours are persisted to `app_prefs` and survive app kill/restart
5. **Given** the save is tapped before the next scheduled nudge today, **Then** the rescheduled notification fires at the new time the same day
6. **Given** the app is first launched with no saved preferences, **Then** nudge times default to 08:00 / 13:00 / 21:00

## Tasks / Subtasks

- [x] Task 1: DB migration — add nudge hour columns to `app_prefs` (AC: 4, 6)
  - [x] Add migration `m0003` to `src/db/migrations/index.ts` with three `ALTER TABLE` statements
  - [x] Update `src/db/schema.ts` — add 3 columns to `app_prefs` table definition
  - [x] Update `src/db/queries/app-prefs.ts` — extend `AppPrefsRow`, `UpsertAppPrefsInput`, `getAppPrefs`, and `upsertAppPrefs`

- [x] Task 2: Update `scheduleDailyNudges` to accept custom hours (AC: 3, 5)
  - [x] Add optional `hours` parameter `{ morning: number; afternoon: number; evening: number }` to `scheduleDailyNudges` in `src/services/notifications.service.ts`
  - [x] Fall back to `{ morning: 8, afternoon: 13, evening: 21 }` when `hours` not provided (existing callers unaffected)

- [x] Task 3: Create `NotificationSettings` component (AC: 1, 2, 3, 4)
  - [x] Create `src/components/settings/` folder (new)
  - [x] Create `src/components/settings/NotificationSettings.tsx`
  - [x] On mount: load current hours from `getAppPrefs()`, default to `{ morning: 8, afternoon: 13, evening: 21 }` if not set
  - [x] Three time rows (morning/afternoon/evening), each showing current time label + edit control
  - [x] iOS: inline `DateTimePicker mode="time" display="spinner"` per row; constrain via `minimumDate`/`maximumDate`
  - [x] Android: tappable time label triggers `DateTimePickerAndroid.open({ mode: 'time' })` imperatively; one picker open at a time; extract hour from returned Date
  - [x] Save button: calls `upsertAppPrefs(nudgeHours)` then `scheduleDailyNudges(translations, hours)`; show brief "saved" confirmation
  - [x] Disable save while saving; re-enable on completion

- [x] Task 4: Update settings screen stub to real screen (AC: 1)
  - [x] Replace stub body in `src/app/(tabs)/settings.tsx` with `ScrollView` containing `NotificationSettings`
  - [x] Use `SafeAreaView` with theme background; apply design system styles

- [x] Task 5: Add i18n keys (AC: 1)
  - [x] Add keys under `"settings"` in `en.json`, `hi.json`, `gu.json`
  - [x] Keys: `notificationTiming`, `morning`, `afternoon`, `evening`, `saved`

- [x] Task 6: Verify `tsc --noEmit` passes cleanly

## Dev Notes

### Overview

This story builds the real settings screen, currently a stub. The only feature in this story is notification timing configuration — a 3-row UI that lets users shift each daily nudge ±2 hours from its default. Persistence goes through the existing `app_prefs` singleton row. The rescheduling reuses `scheduleDailyNudges` which already cancels-then-reschedules internally.

Do NOT implement any other settings features (backup, consent, grievance officer) — those are Stories 6.2–6.4.

---

### Task 1 Details: DB Migration

**Migration pattern** (exact format used in the codebase — never modify existing migrations, always append):

In `src/db/migrations/index.ts`, add after `m0002`:

```ts
const m0003 = `
ALTER TABLE \`app_prefs\` ADD COLUMN \`nudge_morning_hour\` integer NOT NULL DEFAULT 8;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`nudge_afternoon_hour\` integer NOT NULL DEFAULT 13;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`nudge_evening_hour\` integer NOT NULL DEFAULT 21;
`;
```

Add journal entry:
```ts
{
  idx: 3,
  when: 1780491004936,
  tag: '0003_app_prefs_nudge_hours',
  breakpoints: true,
},
```

Add to migrations map:
```ts
'0003_app_prefs_nudge_hours': m0003,
```

**Schema update** — in `src/db/schema.ts`, add to `app_prefs` table:
```ts
nudge_morning_hour: integer('nudge_morning_hour').notNull().default(8),
nudge_afternoon_hour: integer('nudge_afternoon_hour').notNull().default(13),
nudge_evening_hour: integer('nudge_evening_hour').notNull().default(21),
```

**`app-prefs.ts` updates**:

Extend `AppPrefsRow`:
```ts
interface AppPrefsRow {
  language: LanguageCode;
  onboarding_step: OnboardingStep | null;
  onboarding_complete: boolean;
  last_app_open: number | null;
  nudge_morning_hour: number;
  nudge_afternoon_hour: number;
  nudge_evening_hour: number;
}
```

Extend `UpsertAppPrefsInput`:
```ts
interface UpsertAppPrefsInput {
  language?: LanguageCode;
  onboarding_step?: OnboardingStep | null;
  onboarding_complete?: boolean;
  last_app_open?: number;
  nudge_morning_hour?: number;
  nudge_afternoon_hour?: number;
  nudge_evening_hour?: number;
}
```

In `getAppPrefs`, map the new fields:
```ts
nudge_morning_hour: r.nudge_morning_hour ?? 8,
nudge_afternoon_hour: r.nudge_afternoon_hour ?? 13,
nudge_evening_hour: r.nudge_evening_hour ?? 21,
```

In `upsertAppPrefs`, handle new inputs in both update and insert paths (same pattern as `last_app_open`):
```ts
if (input.nudge_morning_hour !== undefined) patch.nudge_morning_hour = input.nudge_morning_hour;
if (input.nudge_afternoon_hour !== undefined) patch.nudge_afternoon_hour = input.nudge_afternoon_hour;
if (input.nudge_evening_hour !== undefined) patch.nudge_evening_hour = input.nudge_evening_hour;
```
For the insert path, include the defaults if not provided.

---

### Task 2 Details: `scheduleDailyNudges` Signature

Current signature (do NOT break existing callers):
```ts
export async function scheduleDailyNudges(translations: {
  morning: string;
  afternoon: string;
  evening: string;
}): Promise<void>
```

New signature:
```ts
export async function scheduleDailyNudges(
  translations: { morning: string; afternoon: string; evening: string },
  hours?: { morning: number; afternoon: number; evening: number },
): Promise<void>
```

Inside the function, replace the hardcoded hour values:
```ts
const h = hours ?? { morning: 8, afternoon: 13, evening: 21 };
const nudges = [
  { id: NUDGE_IDS[0], hour: h.morning, body: translations.morning },
  { id: NUDGE_IDS[1], hour: h.afternoon, body: translations.afternoon },
  { id: NUDGE_IDS[2], hour: h.evening, body: translations.evening },
];
```

Existing caller in `src/app/onboarding/notifications.tsx` passes only `translations` — it will default to `{ morning: 8, afternoon: 13, evening: 21 }`, which is the correct behaviour. No change needed there.

---

### Task 3 Details: `NotificationSettings.tsx`

**File**: `src/components/settings/NotificationSettings.tsx`

**Imports needed**:
- `Platform`, `Pressable`, `ScrollView`, `StyleSheet`, `Text`, `View` from `react-native`
- `DateTimePicker`, `DateTimePickerAndroid`, `type DateTimePickerEvent` from `@react-native-community/datetimepicker`
- `useState`, `useEffect`, `useCallback` from `react`
- `useTranslation` from `react-i18next`
- `useTheme` from `@/hooks/use-theme`
- `FONT_REGULAR`, `FONT_BOLD`, `Spacing` from `@/constants/theme`
- `getAppPrefs`, `upsertAppPrefs` from `@/db/queries/app-prefs`
- `scheduleDailyNudges` from `@/services/notifications.service`

**State**:
```ts
const [morningHour, setMorningHour] = useState(8);
const [afternoonHour, setAfternoonHour] = useState(13);
const [eveningHour, setEveningHour] = useState(21);
const [isSaving, setIsSaving] = useState(false);
const [saved, setSaved] = useState(false);
// Android only: which nudge picker is currently open
const [androidPickerTarget, setAndroidPickerTarget] = useState<'morning' | 'afternoon' | 'evening' | null>(null);
```

**Load on mount**:
```ts
useEffect(() => {
  getAppPrefs().then(({ data }) => {
    if (data) {
      setMorningHour(data.nudge_morning_hour);
      setAfternoonHour(data.nudge_afternoon_hour);
      setEveningHour(data.nudge_evening_hour);
    }
  });
}, []);
```

**Hour-to-Date helper** (inline or as a const in the file):
```ts
function hourToDate(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}
```

**Constraint configuration** (hardcoded — do NOT make this dynamic or configurable):
```ts
const NUDGE_CONFIG = [
  { key: 'morning' as const, min: 6, max: 10, defaultHour: 8 },
  { key: 'afternoon' as const, min: 11, max: 15, defaultHour: 13 },
  { key: 'evening' as const, min: 19, max: 23, defaultHour: 21 },
] as const;
```

**Current hours map** (derived from state, not stored separately):
```ts
const hours = { morning: morningHour, afternoon: afternoonHour, evening: eveningHour };
const setters = { morning: setMorningHour, afternoon: setAfternoonHour, evening: setEveningHour };
```

**iOS time picker per row**: Three inline `DateTimePicker` pickers, one per nudge. Show the label above and the picker below. Use `minimumDate={hourToDate(config.min)}` and `maximumDate={hourToDate(config.max)}` to constrain the hour. The `onChange` extracts `date.getHours()` and calls the appropriate setter.

**Android per row**: A `Pressable` showing the formatted time (`hh:mm AM/PM`). On press, call `DateTimePickerAndroid.open({ mode: 'time', value: hourToDate(hours[key]), is24Hour: false })`. In the `onChange` callback, extract `date.getHours()` and call the setter. Clamp to `[min, max]`.

**`handleSave`**:
```ts
const handleSave = useCallback(async () => {
  if (isSaving) return;
  setIsSaving(true);
  setSaved(false);
  try {
    const { error: prefsErr } = await upsertAppPrefs({
      nudge_morning_hour: morningHour,
      nudge_afternoon_hour: afternoonHour,
      nudge_evening_hour: eveningHour,
    });
    if (prefsErr) {
      console.warn('[NotificationSettings] upsertAppPrefs failed:', prefsErr);
    }
    await scheduleDailyNudges(
      { morning: t('notifications.morning'), afternoon: t('notifications.afternoon'), evening: t('notifications.evening') },
      { morning: morningHour, afternoon: afternoonHour, evening: eveningHour },
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  } finally {
    setIsSaving(false);
  }
}, [isSaving, morningHour, afternoonHour, eveningHour, t]);
```

**Formatting time for display**: Use a simple helper — no date-fns or moment needed:
```ts
function formatHour(hour: number): string {
  const period = hour < 12 ? 'am' : 'pm';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period}`;
}
```

**Design system rules**:
- All text `textTransform: 'lowercase'`, Space Mono font
- `borderRadius: 0` on button
- Colors via `useTheme()`: `theme.background`, `theme.text`, `theme.cta`
- Save button: full-width, `backgroundColor: theme.cta`
- Row label: `FONT_BOLD`, fontSize 16+
- Row time display: `FONT_REGULAR`, fontSize 16+

---

### Task 4 Details: Settings Screen

**File**: `src/app/(tabs)/settings.tsx`

Replace the current stub entirely:
```tsx
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';
import { Typography, FONT_BOLD, Spacing } from '@/constants/theme';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>{t('settings.title')}</Text>
        <NotificationSettings />
      </ScrollView>
    </SafeAreaView>
  );
}
```

Export `NotificationSettings` as a named export (not default) from its file so this import works.

---

### Task 5 Details: i18n Keys

Add under `"settings"` in all three locale files:
```json
"settings": {
  "title": "...",               // already exists — preserve it
  "notificationTiming": "notification timing",
  "morning": "morning",
  "afternoon": "afternoon",
  "evening": "evening",
  "saved": "saved"
}
```

Hindi (`hi.json`):
```json
"notificationTiming": "नोटिफिकेशन समय",
"morning": "सुबह",
"afternoon": "दोपहर",
"evening": "शाम",
"saved": "सेव हो गया"
```

Gujarati (`gu.json`):
```json
"notificationTiming": "નોટિફિકેશન સમય",
"morning": "સવાર",
"afternoon": "બપોર",
"evening": "સાંજ",
"saved": "સાચવ્યું"
```

---

### Critical Patterns to Preserve

**`scheduleDailyNudges` already calls `cancelDailyNudges()` internally** at the top of its body. Do NOT call `cancelDailyNudges()` separately from the save handler — that would double-cancel.

**Existing onboarding notifications caller** (`src/app/onboarding/notifications.tsx`) calls `scheduleDailyNudges(translations)` with no `hours` parameter. This must continue to work after Task 2 — the optional parameter with defaults ensures backwards compatibility. Do not touch `notifications.tsx`.

**`DateTimePickerAndroid` is imperative only** — it does not render a component. On Android, the nudge time rows should render a tappable time label (`Pressable`) that triggers the picker. Do NOT render `<DateTimePicker>` on Android — it's not needed and the `DateTimePickerAndroid.open()` API is the correct approach (same pattern as `follow-up-date-picker.tsx`).

**Only one Android picker open at a time** — use `androidPickerTarget` state to know which nudge is being edited. Open a new `DateTimePickerAndroid.open()` only when no other picker is open, or open unconditionally (Android handles the single-dialog constraint natively).

**Minute ignored** — `scheduleDailyNudges` uses `hour` with `minute: 0`. The time picker may let users pick minutes (especially on Android clock mode) — extract only `date.getHours()` from the picker onChange, ignore `getMinutes()`.

**`expo-notifications` DAILY trigger** — the trigger `{ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 }` schedules recurring daily. If today's time has already passed when the user saves, the notification fires tomorrow first. This is expected.

---

### Existing Code to Verify (Do NOT modify unless broken)

| File | What to check |
|------|---------------|
| `src/app/onboarding/notifications.tsx` | Calls `scheduleDailyNudges(translations)` — must still compile after Task 2 signature change |
| `src/services/notifications.service.ts` | `cancelDailyNudges` is already exported and called internally — do not remove or rename |

---

### File Structure

Architecture planned folder: `src/components/settings/` — create it. Architecture listed these components for Epic 6: `ConsentSettings.tsx`, `BackupSettings.tsx`, `NotificationSettings.tsx` — only `NotificationSettings.tsx` belongs in this story.

---

### Tests

No automated tests in this codebase. Validation gate: `npx tsc --noEmit`.

Manual test scenarios:
1. Open settings tab → notification timing section is visible with 3 times (default 8:00 am / 1:00 pm / 9:00 pm)
2. Change morning to 7:00 am → tap save → confirmed notification at 7:00 am next morning
3. Kill/restart app → settings screen still shows 7:00 am (persisted)
4. Verify regular capture flow still works (regression — settings changes must not break the rest of the app)

---

### References

- Epic 6 spec: `_bmad-output/planning-artifacts/epics/epic-6-settings-privacy-compliance.md`
- Notifications service: `src/services/notifications.service.ts`
- Migration pattern: `src/db/migrations/index.ts` (follow exactly — idx, when, tag, content)
- Schema: `src/db/schema.ts`
- App prefs queries: `src/db/queries/app-prefs.ts`
- DateTimePicker pattern: `src/app/follow-up-date-picker.tsx` (iOS inline + Android imperative)
- Design system: `src/constants/theme.ts`
- i18n locale files: `src/constants/i18n/locales/{en,hi,gu}.json`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- m0003 migration: 3 ALTER TABLE statements adding nudge_morning/afternoon/evening_hour (defaults 8/13/21) to app_prefs
- schema.ts: 3 new columns with .notNull().default() matching migration defaults
- app-prefs.ts: AppPrefsRow and UpsertAppPrefsInput extended; getAppPrefs maps new fields with ?? fallbacks; upsertAppPrefs handles new inputs in both update and insert paths
- notifications.service.ts: scheduleDailyNudges gains optional `hours` param; defaults to {8,13,21} — existing callers unaffected
- NotificationSettings.tsx: named export; loads prefs on mount; iOS inline DateTimePicker per row with min/max constraints; Android tappable label → DateTimePickerAndroid.open imperative; hour clamped to window on both platforms; save → upsertAppPrefs + scheduleDailyNudges + 2s "saved" confirmation; save disabled while isSaving
- settings.tsx: stub replaced with SafeAreaView + ScrollView + NotificationSettings; design system applied
- 5 i18n keys added to all 3 locales (en/hi/gu): notificationTiming, morning, afternoon, evening, saved
- tsc --noEmit: clean

### File List

- src/db/migrations/index.ts (UPDATED — m0003 nudge hour columns)
- src/db/schema.ts (UPDATED — 3 columns on app_prefs)
- src/db/queries/app-prefs.ts (UPDATED — extended types + queries)
- src/services/notifications.service.ts (UPDATED — scheduleDailyNudges hours parameter)
- src/components/settings/NotificationSettings.tsx (NEW)
- src/app/(tabs)/settings.tsx (UPDATED — real screen replacing stub)
- src/constants/i18n/locales/en.json (UPDATED — settings keys)
- src/constants/i18n/locales/hi.json (UPDATED — settings keys)
- src/constants/i18n/locales/gu.json (UPDATED — settings keys)

### Change Log

- 2026-06-15: Story 6-1 implemented — DB migration m0003, scheduleDailyNudges hours param, NotificationSettings component, real settings screen, i18n keys (en/hi/gu)
- 2026-06-15: Code review patches applied (7 findings) — DB write error now returns early before scheduleDailyNudges (no false "saved"); permission guard added via getPermissionsAsync before rescheduling; getAppPrefs error logged (prevents silent default overwrite); minimumDate/maximumDate removed from iOS picker (silently ignored in time mode); savedTimer ref captured and cleared on unmount; SafeAreaView swapped to react-native-safe-area-context; setters moved to useRef (stable identity, useCallback no longer defeated)
