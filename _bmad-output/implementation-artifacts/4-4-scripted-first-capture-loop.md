# Story 4.4: Scripted First Capture Loop

Status: done

## Story

As a new user,
I want to complete a real capture — not a simulation — before leaving onboarding,
so that I see the app work for me before I've invested any trust in it.

## Acceptance Criteria

1. **Given** the onboarding welcome step is complete and `onboarding_step = 'first_capture'`, **When** the app routes to `/onboarding/capture`, **Then** the real capture screen appears (not the stub) with a prompt in the user's language equivalent of "tap and speak about someone you met today"
2. **Given** the capture screen is shown with `permissionStatus === 'undetermined'`, **Then** a plain-language mic explanation ("we'll need your microphone to record") is visible above the RecordButton before the user taps anything
3. **Given** the user taps the RecordButton, **Then** `Audio.requestPermissionsAsync()` fires (the OS dialog appears); the explanation text served as the pre-dialog context (FR38)
4. **Given** microphone permission is granted, **Then** recording starts normally; the full real capture pipeline runs: recording → STT → AI extraction → extraction review → contact link → follow-up scheduling (same as Epic 2 pipeline)
5. **Given** microphone permission is denied, **Then** a typed-text fallback is shown with a multiline `TextInput` and a submit button — the flow never dead-ends (FR38)
6. **Given** the user submits typed text in the fallback, **Then** a text-only memo is created (`audio_path: 'typed-entry'`, transcript set directly), extraction runs via `extractFromTranscript`, and the same downstream pipeline (extraction-review → contact-link) runs
7. **Given** extraction is complete (voice or typed path), **Then** the app navigates to `/extraction-review` (if all fields present) or `/missing-field` (if name or context_points is null) — same logic as `capture.tsx`
8. **Given** the user reaches `capture-complete` with `onboarding_step === 'first_capture'` still active, **Then** after the 2-second display, `onboarding_step` is updated to `'notifications'` (in both Zustand and SQLite), and the app navigates to `/onboarding/notifications` instead of `/(tabs)/contacts`
9. **Given** a user without onboarding context reaches `capture-complete`, **Then** the existing behaviour is unchanged: navigate to `/(tabs)/contacts` after 2 seconds

## Tasks / Subtasks

- [x] Task 1: Replace `/onboarding/capture` stub with real capture screen (AC: 1, 2, 3, 4, 7)
  - [x] Remove the stub body; keep the file at `src/app/onboarding/capture.tsx`
  - [x] Import and use `useCaptureFlow`, `useQueueProcessor`, `useCaptureStore`, `RecordButton`, `ProcessingScreen` (same imports as `capture.tsx`)
  - [x] Add `useState<boolean | null>(null)` for `isConnected`; populate via `Network.getNetworkStateAsync()` on mount
  - [x] Show prompt text `t('onboarding.capturePrompt')` at the top of the screen (always visible)
  - [x] Show `t('onboarding.micExplain')` as secondary text when `permissionStatus === 'undetermined'`
  - [x] Wire RecordButton `onPress` to `handleToggleRecord` (same as `capture.tsx`)
  - [x] Show re-record link when `hasRecorded && !isRecording` — `t('capture.reRecord')`
  - [x] Show a full-width "confirm" CTA button (`t('common.confirm')`) when `hasRecorded && !isRecording` — tapping it calls `store.setIsProcessing(true)` + `tryDrainIfConnected()`
  - [x] Render `<ProcessingScreen memoId={memoId} isConnected={isConnected ?? false} />` wrapped in the container when `isProcessing && memoId`
  - [x] Render retry UI when `hasProcessingError && !isProcessing && memoId` (same pattern as `capture.tsx`)
  - [x] Add `useEffect` that watches `isExtractionComplete`: clears flag, computes `hasMissingFields`, sets `hadMissingFields`, calls `router.push('/missing-field')` or `router.push('/extraction-review')`

- [x] Task 2: Add typed fallback path (AC: 5, 6)
  - [x] Add `typedText: string` state (useState)
  - [x] Add `isTypedProcessing: boolean` state (useState)
  - [x] Render typed fallback branch when `permissionStatus === 'denied'`: show `t('onboarding.micDeniedFallback')` heading, multiline `TextInput` bound to `typedText`, and submit Pressable `t('onboarding.typedFallbackCta')`
  - [x] Implement `handleTypedSubmit`:
    1. Guard: `if (!typedText.trim() || isTypedProcessing) return`
    2. `setIsTypedProcessing(true)` in try block
    3. `insertMemo({ audioPath: 'typed-entry' })` → get `newMemoId`
    4. `updateMemoTranscript(newMemoId, typedText.trim())`
    5. `updateMemoStatus(newMemoId, 'extracted')`
    6. `store.setMemoId(newMemoId)` and `store.setIsProcessing(true)`
    7. `const { data: extracted } = await extractFromTranscript(newMemoId)`
    8. Set all extracted fields in store: `setExtractedName`, `setExtractedContextPoints`, `setExtractedFollowUpDate`, `setExtractedFollowUpIntent`
    9. `store.setIsProcessing(false)` and `store.setIsExtractionComplete(true)`
    10. `finally { setIsTypedProcessing(false) }`
  - [x] While `isTypedProcessing`, show `ActivityIndicator` in submit button instead of text

- [x] Task 3: Update `capture-complete.tsx` to route back to onboarding (AC: 8, 9)
  - [x] Add `const onboarding_step = useAppStore((s) => s.onboarding_step)` selector
  - [x] Add `const appStore = useAppStore()` for setters
  - [x] In `finalize()`, after existing follow-up insertion and analytics, branch on `onboarding_step`:
    - If `onboarding_step === 'first_capture'`: call `appStore.setOnboardingStep('notifications')`, `await upsertAppPrefs({ onboarding_step: 'notifications' })`, then after 2 seconds `router.replace('/onboarding/notifications')` + `reset()`
    - Else: existing behaviour — after 2 seconds `router.replace('/(tabs)/contacts')` + `reset()`
  - [x] Import `useAppStore` and `upsertAppPrefs` at the top of the file (check if already imported)

- [x] Task 4: Add i18n keys (AC: 1, 5)
  - [x] `en.json`: add under `"onboarding"`:
    - `"capturePrompt": "tap and speak about someone you met today"`
    - `"typedFallbackPlaceholder": "what would you like to remember?"`
    - `"typedFallbackCta": "next"`
    - (note: `"micExplain"` and `"micDeniedFallback"` already exist — do NOT add duplicates)
  - [x] `hi.json`: add under `"onboarding"`:
    - `"capturePrompt": "आज किसी के बारे में बोलें"`
    - `"typedFallbackPlaceholder": "आप क्या याद रखना चाहते हैं?"`
    - `"typedFallbackCta": "आगे"`
  - [x] `gu.json`: add under `"onboarding"`:
    - `"capturePrompt": "આજે મળેલ કોઈ વ્યક્તિ વિશે બોલો"`
    - `"typedFallbackPlaceholder": "આપ શું યાદ રાખવા ચાહો છો?"`
    - `"typedFallbackCta": "આગળ"`

- [x] Task 5: Update sprint status
  - [x] Mark `4-4-scripted-first-capture-loop: in-progress` in `sprint-status.yaml`

## Dev Notes

### Overview

This story replaces the stub at `src/app/onboarding/capture.tsx` with a real screen that runs the full Epic 2 capture pipeline. After successful capture → extraction → contact link → follow-up, the `capture-complete` screen detects the onboarding context and routes to `/onboarding/notifications` instead of the normal contacts tab.

### Critical: Navigation Must Stay `router.push` (Not `router.replace`)

When `isExtractionComplete` fires, navigate using `router.push('/extraction-review')` or `router.push('/missing-field')` — NOT `router.replace`. This keeps `/onboarding/capture` alive in the navigation stack. If you use `router.replace`, `useCaptureFlow`'s cleanup `useEffect` fires `store.reset()` immediately on unmount, wiping `memoId`, `extractedName`, etc. before downstream screens can read them. The regular `capture.tsx` also uses `router.push` for this same reason.

### Critical: `capture-complete.tsx` `useEffect` Has Empty Deps

The finalize `useEffect` in `capture-complete.tsx` uses `// eslint-disable-next-line react-hooks/exhaustive-deps` with `[]` deps. This means `onboarding_step` must be read at the component render level (via `useAppStore` selector) so it is captured in the closure at mount time. Do not try to read it inside the async `finalize()` function — it will be stale from the closure.

### Typed Fallback — Text Memo Design

When mic permission is denied:
1. `insertMemo({ audioPath: 'typed-entry' })` — `audio_path` is NOT NULL in schema, so a sentinel is required
2. `updateMemoTranscript(newMemoId, text)` — writes `raw_transcript` directly
3. `updateMemoStatus(newMemoId, 'extracted')` — marks the memo as already processed (bypasses STT queue)
4. `extractFromTranscript(newMemoId)` — reads `raw_transcript` from DB, sends to Claude Haiku
5. Sets all store fields + `isExtractionComplete: true` — same `useEffect` then triggers navigation

Do NOT call `insertQueueItem` for typed memos — there is no audio to transcribe. The status `'extracted'` prevents the queue processor from re-picking this memo.

### `capture-complete.tsx` — Onboarding Detection

```ts
const onboarding_step = useAppStore((s) => s.onboarding_step);
const appStore = useAppStore();
```

In the `finalize` async function, after analytics tracking:
```ts
if (onboarding_step === 'first_capture') {
  appStore.setOnboardingStep('notifications');
  await upsertAppPrefs({ onboarding_step: 'notifications' }).catch((e) =>
    console.warn('[CaptureComplete] app_prefs upsert failed:', e),
  );
  timer = setTimeout(() => {
    router.replace('/onboarding/notifications');
    reset();
  }, 2000);
} else {
  timer = setTimeout(() => {
    router.replace('/(tabs)/contacts');
    reset();
  }, 2000);
}
```

`upsertAppPrefs` is already imported in `capture-complete.tsx` — verify before adding.

### Existing Files to Modify

| File | Change |
|------|--------|
| `src/app/onboarding/capture.tsx` | REPLACE stub with full screen implementation |
| `src/app/capture-complete.tsx` | ADD onboarding routing branch |
| `src/constants/i18n/locales/en.json` | ADD 3 keys under `onboarding` |
| `src/constants/i18n/locales/hi.json` | ADD 3 keys under `onboarding` |
| `src/constants/i18n/locales/gu.json` | ADD 3 keys under `onboarding` |

### Existing Files to Verify (Do NOT Modify Unless Broken)

| File | What to Check |
|------|---------------|
| `src/app/index.tsx` | `STEP_ROUTES['first_capture'] = '/onboarding/capture'` already set — no change needed |
| `src/app/onboarding/welcome.tsx` | Already calls `store.setOnboardingStep('first_capture')` + `upsertAppPrefs({ onboarding_step: 'first_capture' })` + `router.replace('/onboarding/capture')` — no change needed |
| `src/app/extraction-review.tsx` | `handleConfirm` calls `router.push('/contact-linking')` — no change needed |
| `src/app/contact-linking.tsx` | Routes to `/capture-complete` or `/follow-up-date-picker` — no change needed |
| `src/app/follow-up-date-picker.tsx` | Routes to `/capture-complete` — no change needed |

### Key Invariants

- **`store.reset()` timing**: `useCaptureFlow` returns a cleanup that calls `store.reset()` when the component unmounts. The `/onboarding/capture` screen must stay alive in the stack (use `router.push`) until `capture-complete` calls `reset()` explicitly after navigation.
- **No queue item for typed memos**: Skip `insertQueueItem` for the typed fallback path — only call `extractFromTranscript` directly after setting the transcript.
- **`onboarding_step` check in `capture-complete`**: Only check `onboarding_step === 'first_capture'`. Do NOT check `onboarding_complete === false` — that flag is only set to true at the END of notifications screen, so it's still false during the entire capture flow.
- **Zustand + SQLite both updated**: When transitioning to `'notifications'` in `capture-complete`, update BOTH `appStore.setOnboardingStep('notifications')` (Zustand) AND `upsertAppPrefs({ onboarding_step: 'notifications' })` (SQLite) so the step survives app kill (Story 4.6 contract).

### Design System

- All text: `textTransform: 'lowercase'`, Space Mono font (`FONT_REGULAR` / `FONT_BOLD`)
- Min font size: 16sp
- `borderRadius: 0` on all buttons and inputs
- Colors via `useTheme()`: `theme.background`, `theme.text`, `theme.cta`
- The `typedText` `TextInput` should use `borderBottomWidth: 1, borderBottomColor: theme.cta` (no full border) — matches the style in `missing-field.tsx`
- The typed fallback CTA button: full-width, `backgroundColor: theme.cta`, `paddingVertical: Spacing.lg`

### Existing Patterns to Reuse

The `capture.tsx` screen (at `src/app/(tabs)/capture.tsx`) is the template:
- Same `useCaptureFlow` + `useQueueProcessor` + `useCaptureStore` pattern
- Same `useEffect` for `isExtractionComplete`
- Same processing/error state renders
- Replace FAB with a regular `Pressable` CTA for the onboarding screen (no `react-native-paper` needed)

`extractFromTranscript` in `src/services/extraction.service.ts` takes a `memoId`, reads `raw_transcript` from DB, and calls Claude Haiku. This is what the typed fallback uses directly.

`updateMemoTranscript` and `updateMemoStatus` are both exported from `src/db/queries/memos.ts`.

### What NOT to Build

- Do NOT add `isOnboarding` flag to `capture.store.ts` — use `useAppStore.onboarding_step` to detect context in `capture-complete`
- Do NOT add a new `OnboardingStep` value `'first_capture_complete'` — the next valid step is `'notifications'`
- Do NOT skip the real STT + extraction pipeline in voice path — this is a real capture, not a simulation
- Do NOT add a progress bar or step counter to the onboarding capture screen (UX-DR15)
- Do NOT add back navigation (`headerLeft`) — onboarding screens have no back gesture

### Network / Connectivity

Initialize `isConnected` with `Network.getNetworkStateAsync()` on mount (same pattern as `capture.tsx`). Pass it to `ProcessingScreen` for display only — actual processing logic is driven by `useQueueProcessor` which does its own network check.

```ts
const [isConnected, setIsConnected] = useState<boolean | null>(null);

useEffect(() => {
  Network.getNetworkStateAsync()
    .then((s) => setIsConnected(s.isInternetReachable ?? false))
    .catch(() => setIsConnected(false));
}, []);
```

### Tests

There are no automated tests in this codebase (confirmed from `src/` structure). Type-checking via `tsc --noEmit` is the validation gate. Run:
```
npx tsc --noEmit
```

Manually verify (dev server or Expo Go):
1. Full voice path: record → STT → extraction → extraction-review → contact-link → capture-complete → should land on `/onboarding/notifications`
2. Typed fallback path: tap record → deny mic → type text → submit → extraction-review → contact-link → capture-complete → `/onboarding/notifications`
3. Non-onboarding path regression: from regular `/(tabs)/capture`, complete a capture — should still land on `/(tabs)/contacts`

### References

- Epic 4 story 4.4 spec: `_bmad-output/planning-artifacts/epics/epic-4-onboarding.md`
- Onboarding routing: `src/app/index.tsx` (`STEP_ROUTES`)
- Template capture screen: `src/app/(tabs)/capture.tsx`
- `useCaptureFlow` hook: `src/hooks/use-capture-flow.ts`
- `useQueueProcessor` hook: `src/hooks/use-queue-processor.ts`
- Capture store: `src/stores/capture.store.ts`
- App store + `OnboardingStep` type: `src/stores/app.store.ts`
- `insertMemo`, `updateMemoTranscript`, `updateMemoStatus`: `src/db/queries/memos.ts`
- `extractFromTranscript`: `src/services/extraction.service.ts`
- `upsertAppPrefs`: `src/db/queries/app-prefs.ts`
- `capture-complete` (to update): `src/app/capture-complete.tsx`
- Theme + typography: `src/constants/theme.ts`
- Design system rules: `_bmad-output/planning-artifacts/ux-design-specification.md`
- FR38 (mic permission at first attempt): `_bmad-output/planning-artifacts/epics.md` line 61

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Replaced stub `src/app/onboarding/capture.tsx` with full real capture screen using the Epic 2 pipeline (`useCaptureFlow` + `useQueueProcessor` + `useCaptureStore`)
- Typed fallback: creates a `'typed-entry'` audio_path sentinel memo, sets transcript directly in DB, calls `extractFromTranscript` synchronously, triggers same `isExtractionComplete` navigation path
- `capture-complete.tsx`: reads `onboarding_step` at component level (closed over in empty-dep `useEffect`); branches on `=== 'first_capture'` to route to `/onboarding/notifications` and persist step to both Zustand + SQLite
- `upsertAppPrefs` import added to `capture-complete.tsx` (was not previously imported there)
- 3 new i18n keys per locale: `capturePrompt`, `typedFallbackPlaceholder`, `typedFallbackCta`
- `tsc --noEmit` passes cleanly with no errors
- Code review (post-implementation): 5 findings patched
  - [HIGH] `handleTypedSubmit` stuck `isProcessing` on throw → added `catch` block resetting `store.setIsProcessing(false)` + `store.setHasProcessingError(true)`
  - [HIGH] `.catch()` on `upsertAppPrefs` dead code → replaced with `{error}` destructure pattern matching rest of codebase
  - [MED] Ghost navigation after unmount during `await` → added `cancelled` flag; cleanup sets it to `true`, two `if (cancelled) return` guards prevent timer assignment after unmount
  - [MED] Zustand written before DB commit → swapped order: DB write first, store update only on success (`else appStore.setOnboardingStep(...)`)
  - [LOW] `isTypedProcessing` in `useCallback` deps = stale-closure double-submit window → replaced with `isTypedProcessingRef` (useRef); guard now reads ref synchronously before re-render

### File List

- src/app/onboarding/capture.tsx (REPLACED stub)
- src/app/capture-complete.tsx (UPDATED — onboarding routing branch)
- src/constants/i18n/locales/en.json (UPDATED — 3 new keys)
- src/constants/i18n/locales/hi.json (UPDATED — 3 new keys)
- src/constants/i18n/locales/gu.json (UPDATED — 3 new keys)
