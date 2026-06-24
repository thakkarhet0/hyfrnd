# Story 5.1: Follow-up Scheduling from Capture

Status: ready-for-dev

## Story

As a user,
I want to set a follow-up date for a contact right after capturing a memory,
so that I never have to remember to schedule it separately.

## Acceptance Criteria

1. **Given** the capture flow ends (contact-linking complete) **And** a follow-up date was already extracted or confirmed by the user during extraction review **Then** the follow-up is written to `follow_ups` with `status: 'pending'` and a `context_snapshot` from the linked memo's extracted context points — and the date picker screen is NOT shown (already handled by `capture-complete.tsx`)

2. **Given** the capture flow ends **And** NO follow-up date was extracted **Then** `app/follow-up-date-picker.tsx` is shown before `capture-complete.tsx`

3. **Given** the date picker screen is shown **When** the user picks a date **Then** `store.setExtractedFollowUpDate(isoString)` is called **And** `expo-calendar` permission is requested **And** if calendar permission is granted, an event titled with the contact name and `context_snapshot` is added to the default calendar **And** the follow-up is written to `follow_ups` with `status: 'pending'` **And** the user is navigated to `capture-complete.tsx`

4. **Given** the date picker screen is shown **When** the user taps "skip" **Then** navigation proceeds to `capture-complete.tsx` without setting a follow-up date (no follow-up row inserted)

5. **Given** calendar permission is denied **Then** the app proceeds silently — no error shown, follow-up still written to `follow_ups` table, user navigated to capture-complete

6. **Given** i18n is active **Then** all copy on the date picker screen uses the user's selected language from the `followUp` i18n namespace

## Tasks / Subtasks

- [ ] Task 1: Add `followUp` i18n keys to all three locale files (AC: 2, 6)
  - [ ] Add to `src/constants/i18n/locales/en.json`:
    ```json
    "followUp": {
      "scheduleTitle": "when should i follow up?",
      "skip": "skip for now",
      "confirm": "schedule follow-up",
      "calendarAdded": "added to your calendar",
      "calendarDenied": "saved — you can review in contacts"
    }
    ```
  - [ ] Add equivalent translations to `hi.json` (Hindi) and `gu.json` (Gujarati)

- [ ] Task 2: Create `src/app/follow-up-date-picker.tsx` (AC: 2, 3, 4, 5, 6)
  - [ ] Read `extractedName`, `extractedContextPoints`, `linkedContactId`, `memoId` from `useCaptureStore()`
  - [ ] Local state: `selectedDate: Date` (default: tomorrow), `isSubmitting: boolean`
  - [ ] **Android:** On mount, call `DateTimePickerAndroid.open({ value: selectedDate, mode: 'date', minimumDate: tomorrow, onChange })` — tapping outside/cancel counts as skip
  - [ ] **iOS:** Render inline `DateTimePicker` (`mode="date"`, `minimumDate={tomorrow}`) with confirm + skip buttons below
  - [ ] `handleConfirm(date: Date)`:
    1. Set `isSubmitting = true`
    2. `store.setExtractedFollowUpDate(date.toISOString())`
    3. Request calendar permission: `await Calendar.requestCalendarPermissionsAsync()`
    4. If granted: `await createCalendarEvent(date, extractedName, contextSnapshotText)` (helper defined in same file)
    5. Insert follow-up: `await insertFollowUp({ contactId: linkedContactId, memoId, dueDate: date.getTime(), contextSnapshot })`
    6. Log error if insertFollowUp fails but proceed
    7. `router.replace('/capture-complete')`
  - [ ] `handleSkip()`: `router.replace('/capture-complete')` (no store mutation, no DB write)
  - [ ] `createCalendarEvent(date, name, context)` helper: use `expo-calendar` — `Calendar.createEventAsync(calendarId, { title: name, startDate: date, endDate: +1hr, notes: context })` where `calendarId = await getDefaultCalendarId()`
  - [ ] `getDefaultCalendarId()` helper: `Calendar.getDefaultCalendarAsync()` on iOS; `Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT).then(cals => cals[0]?.id)` on Android — return null if unavailable
  - [ ] iOS only: show a loading indicator while `isSubmitting` is true (replaces the confirm button with an ActivityIndicator)
  - [ ] All text lowercase Space Mono per design system; flat edges (`borderRadius: 0`); colors from `useTheme()`
  - [ ] Screen heading: `t('followUp.scheduleTitle')` at FONT_BOLD 24sp
  - [ ] Skip button: `t('followUp.skip')` at FONT_REGULAR 16sp, text-only (no background fill)
  - [ ] Confirm button: `t('followUp.confirm')` at FONT_REGULAR 18sp, filled with `theme.cta`

- [ ] Task 3: Gate navigation in `src/app/contact-linking.tsx` (AC: 2)
  - [ ] In `linkContact()`, after `setLinkedContactId(contactId)` and `setIsNewContact(isNew)`, read `extractedFollowUpDate` from the store
  - [ ] If `extractedFollowUpDate` is null → `router.push('/follow-up-date-picker')`
  - [ ] If `extractedFollowUpDate` is non-null → `router.push('/capture-complete')` (unchanged — existing flow)
  - [ ] **Important:** read `extractedFollowUpDate` from `useCaptureStore()` at the top of the component (already destructures from store)

- [ ] Task 4: Update sprint-status.yaml

## Dev Notes

### Navigation Flow (Critical)

Current flow: `contact-linking → capture-complete`

New flow with this story:
```
contact-linking
  ├─ extractedFollowUpDate is set → /capture-complete (no change)
  └─ extractedFollowUpDate is null → /follow-up-date-picker → /capture-complete
```

`capture-complete.tsx` (Story 2.9) is NOT modified in this story. It already handles:
- If `extractedFollowUpDate` is in the capture store → `insertFollowUp()` on mount
- If no follow-up date → shows "saved" without follow-up line

If user picks a date on the follow-up screen, `store.setExtractedFollowUpDate()` is called BEFORE navigating to `capture-complete`. So `capture-complete.tsx`'s existing `insertFollowUp` logic handles the DB write. This avoids double-writes.

**Correction:** Do NOT also call `insertFollowUp` in `follow-up-date-picker.tsx` — let `capture-complete.tsx` handle it as it already does. The date picker screen only sets the store value and (optionally) creates the calendar event. This keeps follow-up insertion logic in one place.

**For skip:** No store mutation, no DB write. `capture-complete.tsx` will see `extractedFollowUpDate === null` and won't insert a follow-up, which is correct.

### Android Date Picker Pattern

`DateTimePickerAndroid` from `@react-native-community/datetimepicker` is included in Expo SDK 56 (bundled via `expo` package). Use the static `.open()` API — it does NOT render a React component:

```tsx
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

// Call in useEffect on Android (only fires once on mount)
useEffect(() => {
  if (Platform.OS !== 'android') return;
  const tomorrow = new Date(Date.now() + 86400000);
  DateTimePickerAndroid.open({
    value: tomorrow,
    mode: 'date',
    minimumDate: tomorrow,
    onChange: (event, date) => {
      if (event.type === 'set' && date) {
        void handleConfirm(date);
      } else {
        // dismissed or cancelled → treat as skip
        handleSkip();
      }
    },
  });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

### iOS Date Picker Pattern

Use the `DateTimePicker` component inline (not in a Modal — simpler):

```tsx
import DateTimePicker from '@react-native-community/datetimepicker';

// Inside JSX (iOS only):
<DateTimePicker
  value={selectedDate}
  mode="date"
  minimumDate={tomorrow}
  display="spinner"
  onChange={(_, date) => { if (date) setSelectedDate(date); }}
  style={{ alignSelf: 'center' }}
/>
```

### Calendar Integration (expo-calendar)

```tsx
import * as Calendar from 'expo-calendar';

async function getDefaultCalendarId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      return defaultCal?.id ?? null;
    }
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return cals.find((c) => c.allowsModifications)?.id ?? null;
  } catch {
    return null;
  }
}

async function createCalendarEvent(date: Date, name: string, notes: string | null) {
  const calendarId = await getDefaultCalendarId();
  if (!calendarId) return;
  const endDate = new Date(date.getTime() + 3600000); // +1 hour
  await Calendar.createEventAsync(calendarId, {
    title: name,
    startDate: date,
    endDate,
    notes: notes ?? undefined,
    alarms: [{ relativeOffset: -60 }], // 1hr reminder
  });
}
```

### Capture Store Fields Used

All read-only from `useCaptureStore()` in this screen:
- `extractedName` — for calendar event title
- `extractedContextPoints` — for `context_snapshot` (`contextPoints.join('; ')`)
- `linkedContactId` — for `insertFollowUp` (not used directly; capture-complete handles this)
- `memoId` — same as above
- `extractedFollowUpDate` — only READ in `contact-linking.tsx` (null check)

Only ONE store mutation from this screen:
- `setExtractedFollowUpDate(isoString)` — called on confirm, before navigating to capture-complete

### Pattern Compliance

- **Hooks rules:** all `useEffect`, `useCaptureStore`, `useTheme`, `useTranslation` calls BEFORE any conditional return
- **No throws:** `createCalendarEvent` must return `Promise<void>` and never throw — wrap in try/catch internally
- **Font sizes:** min 16sp everywhere; heading at 24sp
- **textTransform: 'lowercase'** on all Text components
- **borderRadius: 0** on all Pressable/button elements (flat edges)
- **`theme.cta`** for confirm button background; **`theme.text`** for skip text
- **Spacing:** use `Spacing.lg` (24), `Spacing.md` (16), `Spacing.sm` (8) from `@/constants/theme`
- **AnyTheme pattern:** `const theme = useTheme()` — don't type it as `typeof Colors.light`
- **No Zustand for follow-up data** — the follow-up row lives in SQLite only

### Files to Create

- `src/app/follow-up-date-picker.tsx` — NEW

### Files to Update

- `src/app/contact-linking.tsx` — navigation gate in `linkContact()` (line ~72)
- `src/constants/i18n/locales/en.json` — add `followUp` section
- `src/constants/i18n/locales/hi.json` — add `followUp` section
- `src/constants/i18n/locales/gu.json` — add `followUp` section

### Files NOT Changed by This Story

- `src/app/capture-complete.tsx` — leave untouched; it already calls `insertFollowUp` when `extractedFollowUpDate` is set
- `src/db/queries/follow-ups.ts` — `insertFollowUp` already exists, no changes needed
- `src/db/schema.ts` — `follow_ups` table already has all needed columns
- `src/stores/capture.store.ts` — `setExtractedFollowUpDate` already exists, no changes needed

### i18n Keys Required (en.json)

Add under top-level `"followUp"` key:

```json
"followUp": {
  "scheduleTitle": "when should i follow up?",
  "skip": "skip for now",
  "confirm": "schedule follow-up",
  "calendarAdded": "added to your calendar",
  "calendarDenied": "saved — you can review in contacts"
}
```

Hindi (`hi.json`) equivalent:
```json
"followUp": {
  "scheduleTitle": "कब फॉलो अप करना है?",
  "skip": "अभी नहीं",
  "confirm": "फॉलो अप शेड्यूल करें",
  "calendarAdded": "कैलेंडर में जोड़ा गया",
  "calendarDenied": "सेव किया गया — contacts में देखें"
}
```

Gujarati (`gu.json`) equivalent:
```json
"followUp": {
  "scheduleTitle": "ક્યારે ફૉલો અપ કરવું?",
  "skip": "અત્યારે નહીં",
  "confirm": "ફૉલો અપ શેડ્યૂલ કરો",
  "calendarAdded": "કૅલેન્ડરમાં ઉમેર્યું",
  "calendarDenied": "સેવ થઈ ગયું — contacts માં જુઓ"
}
```

### Error Handling

- `insertFollowUp` failure → `console.warn`, proceed to `capture-complete` (non-fatal for UX)
- `Calendar.requestCalendarPermissionsAsync()` rejection → silently proceed (never block navigation on calendar)
- `createCalendarEvent` failure → silently log, proceed (calendar write is best-effort)
- `DateTimePickerAndroid.open()` dismiss/cancel → treat as skip → `router.replace('/capture-complete')`

### Tomorrow Calculation

```ts
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(9, 0, 0, 0); // 9 AM
```

### Reference Sources

- Epic 5 story 5.1: `_bmad-output/planning-artifacts/epics/epic-5-followup-notifications.md`
- Architecture follow_ups schema: `_bmad-output/planning-artifacts/architecture.md#Data Architecture`
- Architecture service return pattern: `_bmad-output/planning-artifacts/architecture.md#Service Return Pattern`
- Capture store: `src/stores/capture.store.ts`
- Existing contact-linking navigation: `src/app/contact-linking.tsx:72`
- Existing capture-complete insertFollowUp: `src/app/capture-complete.tsx:36-49`
- Existing insertFollowUp query: `src/db/queries/follow-ups.ts:38`
- Design tokens: `src/constants/theme.ts` (Spacing, FONT_REGULAR, FONT_BOLD, Typography)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
