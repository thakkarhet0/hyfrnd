# Story 2.3: Audio Persistence and STT Queue

Status: done

## Story

As a user,
I want my voice memo to be safe even if my phone dies or I lose internet immediately after recording,
So that I never lose a memory I just captured.

## Acceptance Criteria

1. **Given** the audio file has been written to permanent storage (Story 2.2 complete) **When** the user stops recording **Then** a row is inserted into the `stt_queue` table with `status: 'pending'`, the audio file path, and the memo_id
2. **And** a row is inserted into `memos` with `status: 'pending'` (FR7)
3. **And** the memo status is visible as "processing" in any memo list view
4. **When** the device has network connectivity at this moment **Then** the STT queue processor immediately picks up the pending item and begins transcription (calls `stt.service.ts`)
5. **When** the device has no network connectivity **Then** the queue item remains with `status: 'pending'`
6. **And** the app transitions to the processing screen showing the pending state (FR5)
7. **When** connectivity is restored while the app is in the foreground **Then** the queue processor retries and processes the pending item (FR15)
8. **And** the memo status updates to `extracted` or `failed` accordingly (FR7)

## Tasks / Subtasks

- [x] Task 1: Install `expo-network` (AC: 4, 5, 7)
  - [x] Run `npx expo install expo-network` in `gods-plan/`
  - [x] Verify `import * as Network from 'expo-network'` resolves in TypeScript

- [x] Task 2: Create `src/db/queries/memos.ts` — memo DB operations (AC: 2, 8)
  - [x] Import `getDb` from `@/db`, `memos` table from `@/db/schema`
  - [x] `insertMemo(data: { audioPath: string }): Promise<{ data: string | null; error: Error | null }>` — inserts a pending memo, returns the generated `id`
    - [x] Set `audio_path`, `status: 'pending'`, `created_at: Date.now()`; `id` auto-generated via schema `$defaultFn`
  - [x] `updateMemoStatus(id: string, status: 'pending' | 'extracted' | 'failed'): Promise<{ data: null; error: Error | null }>` — sets `memos.status`
  - [x] All functions follow service return pattern: `{ data, error }`, never throw

- [x] Task 3: Create `src/db/queries/queue.ts` — STT queue DB operations (AC: 1, 4, 5, 7, 8)
  - [x] Import `getDb` from `@/db`, `stt_queue` from `@/db/schema`
  - [x] `insertQueueItem(data: { memoId: string; audioPath: string }): Promise<{ data: string | null; error: Error | null }>` — inserts with `status: 'pending'`, `attempts: 0`, `created_at: Date.now()`
  - [x] `updateQueueItemStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed'): Promise<{ data: null; error: Error | null }>`
  - [x] `getPendingQueueItems(): Promise<{ data: Array<{ id: string; memo_id: string; audio_path: string; attempts: number }> | null; error: Error | null }>` — SELECT WHERE `status = 'pending'` ORDER BY `created_at ASC`
  - [x] All functions follow service return pattern: `{ data, error }`, never throw

- [x] Task 4: Create stub `src/services/stt.service.ts` — queue processor stub (AC: 4)
  - [x] Export `interface QueueItem { id: string; memo_id: string; audio_path: string; attempts: number }`
  - [x] Export `async function processQueueItem(item: QueueItem): Promise<{ data: string | null; error: Error | null }>` — stub that returns `{ data: null, error: new Error('STT not yet implemented — Story 2.4') }` and logs `[STT] processQueueItem stub called for memo ${item.memo_id}`
  - [x] This function will be REPLACED in Story 2.4 — the interface and return type must not change

- [x] Task 5: Update `src/stores/capture.store.ts` — add memoId and processingState (AC: 3, 6)
  - [x] Add `memoId: string | null` field (initial: `null`)
  - [x] Add `isProcessing: boolean` field (initial: `false`)
  - [x] Add `setMemoId(id: string | null): void` action
  - [x] Add `setIsProcessing(b: boolean): void` action
  - [x] Update `reset()` to also set `memoId: null, isProcessing: false`

- [x] Task 6: Create `src/hooks/use-queue-processor.ts` — connectivity-aware queue runner (AC: 4, 5, 7, 8)
  - [x] Import: `Network` from `expo-network`; `AppState` from `react-native`; `processQueueItem` from `@/services/stt.service`; `getPendingQueueItems`, `updateQueueItemStatus` from `@/db/queries/queue`; `updateMemoStatus` from `@/db/queries/memos`; `useCaptureStore` from `@/stores/capture.store`
  - [x] Export `function useQueueProcessor()` — a React hook, no parameters
  - [x] Internal `async function drainQueue()`:
    - [x] Get pending items: `const { data: items } = await getPendingQueueItems()` — return early if null or empty
    - [x] For each item: `await updateQueueItemStatus(item.id, 'processing')`
    - [x] Call `const { error } = await processQueueItem(item)`
    - [x] On success (no error): `await updateQueueItemStatus(item.id, 'completed')`, `await updateMemoStatus(item.memo_id, 'extracted')`, call `store.setIsProcessing(false)`
    - [x] On error: `await updateQueueItemStatus(item.id, 'failed')`, `await updateMemoStatus(item.memo_id, 'failed')`, call `store.setIsProcessing(false)`
  - [x] `async function tryDrainIfConnected()`:
    - [x] `const { isInternetReachable } = await Network.getNetworkStateAsync()`
    - [x] If `isInternetReachable === true`: call `drainQueue()`
    - [x] Otherwise: no-op (queue stays pending, store.isProcessing stays true)
  - [x] `useEffect` that:
    - [x] Calls `tryDrainIfConnected()` once on mount
    - [x] Sets up `AppState.addEventListener('change', (state) => { if (state === 'active') tryDrainIfConnected(); })`
    - [x] Returns cleanup that removes the AppState subscription
  - [x] Return `{ tryDrainIfConnected }` (callable from hook consumers)

- [x] Task 7: Update `src/hooks/use-capture-flow.ts` — insert DB rows after stopRecording (AC: 1, 2, 6)
  - [x] Add import: `insertMemo` from `@/db/queries/memos`; `insertQueueItem` from `@/db/queries/queue`; `useCaptureStore` already imported
  - [x] After `store.setHasRecorded(true)` in `stopRecording`, add:
    ```ts
    const { data: memoId, error: memoErr } = await insertMemo({ audioPath: permanentPath });
    if (memoErr || !memoId) {
      setError('failed to save memo record');
      return;
    }
    const { error: queueErr } = await insertQueueItem({ memoId, audioPath: permanentPath });
    if (queueErr) {
      setError('failed to queue memo for transcription');
      return;
    }
    store.setMemoId(memoId);
    store.setIsProcessing(true);
    ```
  - [x] These DB calls must happen AFTER `store.setHasRecorded(true)` (audio already on disk per Critical Invariant 1)
  - [x] On error from DB calls: do NOT reset the capture store (audio is already safe on disk); only set the error string

- [x] Task 8: Create `src/components/capture/ProcessingScreen.tsx` — processing UI (AC: 3, 6)
  - [x] Props: `{ memoId: string; isConnected: boolean }`
  - [x] Display lowercase `t('capture.processingMemo')` as header (Space Mono, 16sp minimum)
  - [x] Show a static animated teal pulse (2 `Animated.View` circles, `useSharedValue`, `withRepeat(withSequence(withTiming(1.2), withTiming(1)), -1)` on `scale`) — or a React Native `ActivityIndicator` in `theme.accent` color (simpler, acceptable)
  - [x] When `!isConnected`: show `t('capture.processingOffline')` subtitle text explaining memo will sync when online (FR5)
  - [x] When `isConnected`: show `t('capture.processingOnline')` subtitle text
  - [x] All elements flat-edge (`borderRadius: 0`), all text lowercase Space Mono
  - [x] **No** back button, no navigation controls — purely informational, advances automatically when STT completes

- [x] Task 9: Update `src/app/(tabs)/capture.tsx` — show ProcessingScreen, wire FAB (AC: 3, 6)
  - [x] Import `useQueueProcessor` from `@/hooks/use-queue-processor`
  - [x] Import `ProcessingScreen` from `@/components/capture/ProcessingScreen`
  - [x] Import `Network` from `expo-network`
  - [x] Add local state: `const [isConnected, setIsConnected] = useState<boolean | null>(null)`
  - [x] Add `useEffect` that calls `Network.getNetworkStateAsync().then(s => setIsConnected(s.isInternetReachable ?? false))`
  - [x] Call `useQueueProcessor()` to activate the background processor
  - [x] Destructure `memoId, isProcessing` from `useCaptureStore`
  - [x] When `isProcessing && memoId`: render `<ProcessingScreen memoId={memoId} isConnected={isConnected ?? false} />` instead of the record/re-record UI
  - [x] FAB: when `hasRecorded && !isProcessing`: set `onPress` to `() => { store.setIsProcessing(true); tryDrainIfConnected(); }` — this allows user to manually re-trigger processing from re-record state. When `isProcessing`: hide the FAB (`style={{ display: 'none' }}`). Otherwise keep FAB as-is (idle state, onPress={()=>{}})

- [x] Task 10: Update i18n locale files (AC: 6)
  - [x] `en.json`: add `capture.processingMemo: "processing your memo"`, `capture.processingOnline: "transcribing..."`, `capture.processingOffline: "will transcribe when online"`
  - [x] `hi.json`: add same three keys in Hindi: `"आपका मेमो प्रोसेस हो रहा है"`, `"ट्रांसक्राइब हो रहा है..."`, `"ऑनलाइन होने पर ट्रांसक्राइब होगा"`
  - [x] `gu.json`: add same three keys in Gujarati: `"તમારો મેમો પ્રોસેસ થઈ રહ્યો છે"`, `"ટ્રાન્સક્રાઇબ થઈ રહ્યું છે..."`, `"ઓનલાઇન થયા પછી ટ્રાન્સક્રાઇબ થશે"`

- [x] Task 11: Validate (AC: all)
  - [x] Run `npx tsc --noEmit` in `gods-plan/` — zero errors
  - [x] Run `npm run lint` in `gods-plan/` — zero warnings

## Dev Notes

**CRITICAL: Read `https://docs.expo.dev/versions/v56.0.0/` before writing any code (per AGENTS.md).**

### What Story 2.2 Built (Do Not Break)

Story 2.2 completed:
- `src/stores/capture.store.ts` — `useCaptureStore` with `recordingUri | null`, `isRecording`, `hasRecorded`, `reset()`
- `src/hooks/use-capture-flow.ts` — `startRecording`, `stopRecording`, `reRecord`; audio written to `AUDIO_DIR + 'memo-' + Date.now() + '.m4a'`; `expo-file-system/legacy` import pattern; `Audio.Recording` in `useRef` not Zustand
- `src/components/capture/RecordButton.tsx` — `borderRadius: 40` is THE ONLY circle element on screen
- `src/components/capture/WaveformAnimation.tsx` — Reanimated 4 animated bars
- `src/app/(tabs)/capture.tsx` — RecordButton + hint text + re-record option + FAB (onPress={}); comment says "will be wired to capture flow in Story 2.3"
- i18n keys: `capture.recordButton`, `capture.tapToStop`, `capture.reRecord`, `capture.micPermissionNeeded`

### Critical Invariants (must not violate)

1. **Audio-first (Critical Invariant 1):** DB insertions in `stopRecording` MUST happen AFTER `FileSystem.moveAsync` completes and audio is on disk. The store already sets `hasRecorded: true` after the move — DB insertions go after that. Never trigger DB insertions before audio is written.
2. **Consent gate (Critical Invariant 2):** The STT consent check is enforced inside `stt.service.ts`, NOT in the queue processor hook or UI. Story 2.3's stub in `stt.service.ts` should return `{ data: null, error: new Error('STT not yet implemented') }` without checking consent — Story 2.4 adds the consent gate.
3. **No silent drops (Critical Invariant 4):** If DB insertion fails (memo or queue), set the error string but do NOT delete the audio file. The audio must stay on disk; user can re-trigger from the re-record state.
4. **Service return pattern:** ALL functions in `db/queries/*.ts` and `services/stt.service.ts` return `{ data, error }`. Never throw. Callers check the error field.

### DB Layer Pattern (from architecture.md)

```ts
// src/db/queries/memos.ts
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { memos } from '@/db/schema';

export async function insertMemo(data: {
  audioPath: string;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .insert(memos)
      .values({
        audio_path: data.audioPath,
        status: 'pending',
        created_at: Date.now(),
      })
      .returning({ id: memos.id });
    return { data: rows[0].id, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateMemoStatus(
  id: string,
  status: 'pending' | 'extracted' | 'failed',
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.update(memos).set({ status }).where(eq(memos.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
```

### Drizzle `.returning()` API Note

`op-sqlite` Drizzle driver supports `.returning()`. Use it after `insert()` to get back the auto-generated `id` without a second SELECT call. This is how the schema `$defaultFn(() => nanoid())` auto-ID is retrieved.

### expo-network API (SDK 56)

```ts
import * as Network from 'expo-network';

// One-time check
const state = await Network.getNetworkStateAsync();
// state.isInternetReachable: boolean | null
// null means the check is still in progress or unavailable
// treat null as "not connected" for safety
```

`expo-network` does NOT provide a subscription/event API in SDK 56. Connectivity change detection must use `AppState` — re-check network when app transitions to `'active'` foreground state. This is the recommended approach for on-device queue processors.

### AppState Connectivity Pattern

```ts
import { AppState, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';

// In useEffect:
const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
  if (nextState === 'active') {
    tryDrainIfConnected();
  }
});
return () => subscription.remove();
```

The `AppState` listener fires when the app comes back to foreground — this covers: user switches away → comes back, device unlocks, etc. Combined with the mount-time check, this satisfies the "connectivity restored while app is in foreground" AC.

### stt.service.ts Interface Contract (Story 2.4 must not break)

```ts
// src/services/stt.service.ts — Story 2.3 stub
export interface QueueItem {
  id: string;
  memo_id: string;
  audio_path: string;
  attempts: number;
}

// Story 2.4 will REPLACE the implementation of this function.
// The function signature and return type MUST NOT change between stories.
export async function processQueueItem(
  item: QueueItem,
): Promise<{ data: string | null; error: Error | null }> {
  console.log(`[STT] processQueueItem stub called for memo ${item.memo_id}`);
  return { data: null, error: new Error('STT not yet implemented — Story 2.4') };
}
```

**Why return type `data: string | null`:** Story 2.4 will populate `data` with the raw transcript string. The queue processor in Story 2.3 ignores `data` (it's null anyway), but the interface must be stable so 2.4 only replaces the function body.

### capture.store.ts Changes

Story 2.2 left the store as:
```ts
interface CaptureState {
  recordingUri: string | null;
  isRecording: boolean;
  hasRecorded: boolean;
  setRecordingUri, setIsRecording, setHasRecorded, reset
}
```

Story 2.3 adds:
```ts
interface CaptureState {
  // ... existing fields ...
  memoId: string | null;       // DB id of the pending memo
  isProcessing: boolean;       // true while stt_queue item is in-flight
  setMemoId: (id: string | null) => void;
  setIsProcessing: (b: boolean) => void;
  // reset() must also set memoId: null, isProcessing: false
}
```

**Do not change existing field names or action signatures** — `RecordButton`, `useCaptureFlow`, and `capture.tsx` depend on them.

### use-capture-flow.ts Modification (exact insertion point)

Current `stopRecording` in Story 2.2 ends with:
```ts
store.setRecordingUri(permanentPath);
store.setHasRecorded(true);
store.setIsRecording(false);
recordingRef.current = null;
```

Story 2.3 inserts DB calls AFTER the store updates (audio is already on disk by this point):
```ts
store.setRecordingUri(permanentPath);
store.setHasRecorded(true);
store.setIsRecording(false);
recordingRef.current = null;

// DB persistence — audio already safe on disk per Critical Invariant 1
const { data: memoId, error: memoErr } = await insertMemo({ audioPath: permanentPath });
if (memoErr || !memoId) {
  setError(memoErr?.message ?? 'failed to save memo record');
  // Audio file stays on disk — user can re-record or retry
  return;
}
const { error: queueErr } = await insertQueueItem({ memoId, audioPath: permanentPath });
if (queueErr) {
  setError(queueErr.message);
  // Memo row exists but no queue item — user sees error, audio safe
  return;
}
store.setMemoId(memoId);
store.setIsProcessing(true);
```

These lines must go inside the existing `try` block in `stopRecording` (before the closing brace), but after the `recordingRef.current = null` assignment — otherwise a DB error could be mishandled by the existing catch which calls `store.reset()`.

Actually: to avoid the catch block resetting the store on a DB error (which would lose the `hasRecorded: true` and the audio path), the DB insertions should be in a nested try/catch or placed AFTER the outer try block ends. Safest: add a second `try/catch` immediately after the first one resolves:

```ts
// Outer try/catch ends with recordingRef.current = null
// ...

// Separate try/catch for DB operations — do NOT call store.reset() on DB failure
try {
  const { data: memoId, error: memoErr } = await insertMemo({ audioPath: permanentPath });
  if (memoErr || !memoId) { setError(memoErr?.message ?? 'save failed'); return; }
  const { error: queueErr } = await insertQueueItem({ memoId, audioPath: permanentPath });
  if (queueErr) { setError(queueErr.message); return; }
  store.setMemoId(memoId);
  store.setIsProcessing(true);
} catch (dbErr) {
  setError(dbErr instanceof Error ? dbErr.message : 'db error');
  // audio file is safe; user can re-record
}
```

But the cleanest approach is to restructure `stopRecording` so that the first try/catch only covers audio operations (up to and including `recordingRef.current = null`), and the DB try/catch is a distinct block after. The audio mode reset and haptic (currently placed outside the try block per code-review fix #3) remain outside both try blocks.

### ProcessingScreen Component Notes

- Use React Native `ActivityIndicator` for the spinner — simpler than custom animation, acceptable per design system
- Color: `theme.accent` (teal `#7FC7D9`)
- All text: `Typography.body` style from `@/constants/theme`, `textTransform: 'lowercase'`
- Container: `flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16`
- No navigation controls — this screen auto-advances when STT completes (Story 2.4 adds the navigation)

### capture.tsx ProcessingScreen Wiring

The `capture.tsx` render should prioritize states:
```tsx
// Priority 1: Processing
if (isProcessing && memoId) {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ProcessingScreen memoId={memoId} isConnected={isConnected ?? false} />
    </View>
  );
}

// Priority 2: Normal record/re-record flow (existing JSX)
return (
  <View style={[styles.container, { backgroundColor: theme.background }]}>
    ...existing center + FAB...
  </View>
);
```

FAB onPress change: when `hasRecorded && !isProcessing`, the FAB provides a manual "proceed" path in case auto-submit failed:
```tsx
<FAB
  icon={hasRecorded && !isProcessing ? 'check' : 'plus'}
  onPress={hasRecorded && !isProcessing
    ? () => { store.setIsProcessing(true); void tryDrainIfConnected(); }
    : () => {}
  }
  ...
/>
```

### Network Connectivity Logic for useQueueProcessor

```ts
async function tryDrainIfConnected() {
  const { isInternetReachable } = await Network.getNetworkStateAsync();
  if (isInternetReachable === true) {
    await drainQueue();
  }
  // isInternetReachable === false or null → queue stays pending, isProcessing stays true
}
```

`isInternetReachable` can be `null` on some Android devices. Treat `null` as not-connected to avoid triggering STT when connectivity is uncertain.

### Validation Commands

```bash
cd gods-plan
npx tsc --noEmit   # must exit 0
npm run lint       # must exit 0 (eslint --max-warnings 0)
```

No test runner exists — TypeScript + lint IS the validation layer.

### File Structure for This Story

```
gods-plan/src/
├── db/queries/
│   ├── memos.ts                    ← NEW
│   └── queue.ts                    ← NEW
├── services/
│   └── stt.service.ts              ← NEW (stub)
├── stores/capture.store.ts         ← UPDATE: add memoId, isProcessing
├── hooks/
│   ├── use-capture-flow.ts         ← UPDATE: DB insertions after stopRecording
│   └── use-queue-processor.ts      ← NEW
├── components/capture/
│   └── ProcessingScreen.tsx        ← NEW
├── app/(tabs)/capture.tsx          ← UPDATE: ProcessingScreen + FAB wiring
└── constants/i18n/locales/
    ├── en.json                     ← UPDATE: 3 new processing keys
    ├── hi.json                     ← UPDATE: 3 new processing keys
    └── gu.json                     ← UPDATE: 3 new processing keys
gods-plan/package.json              ← UPDATE: expo-network added
```

### References

- [Source: epics/epic-2-core-capture-loop.md — Story 2.3 ACs, FR7, FR5, FR15]
- [Source: architecture.md — Offline Queue: stt_queue table, queue states pending→processing→completed|failed]
- [Source: architecture.md — Critical Invariants 1 (audio-first), 2 (consent gate), 4 (no silent drops)]
- [Source: architecture.md — Service Return Pattern: always { data, error }, never throw]
- [Source: architecture.md — Project Structure: services/, db/queries/, components/capture/ProcessingScreen.tsx]
- [Source: 2-2-record-button-audio-recording-and-haptic-feedback.md — existing store, hook, and capture.tsx shape]
- [Source: architecture.md — State Ownership Rules: Drizzle = source of truth, Zustand = ephemeral UI]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `expo-router/react-navigation` DarkTheme/DefaultTheme had a pre-existing type mismatch with ThemeProvider in `_layout.tsx`. Fixed by switching to `@react-navigation/native` import (available as transitive dep, same objects, correct types).
- `Array<T>` lint rule — `@typescript-eslint/array-type` requires `T[]` syntax. Fixed in `getPendingQueueItems` return type.

### Completion Notes List

- `src/db/queries/memos.ts` (new): `insertMemo` (returns generated id), `updateMemoStatus`. Service return pattern `{ data, error }`, never throw.
- `src/db/queries/queue.ts` (new): `insertQueueItem`, `updateQueueItemStatus`, `getPendingQueueItems` (pending items ordered by created_at).
- `src/services/stt.service.ts` (new, stub): `QueueItem` interface + `processQueueItem` stub returning not-yet-implemented error. Interface contract locked for Story 2.4.
- `src/stores/capture.store.ts` (updated): added `memoId: string | null`, `isProcessing: boolean`, `setMemoId`, `setIsProcessing`; `reset()` clears new fields.
- `src/hooks/use-queue-processor.ts` (new): `drainQueue` processes pending queue items via stt.service; `tryDrainIfConnected` gates on `expo-network` `isInternetReachable`; `useEffect` runs on mount + AppState 'active' changes.
- `src/hooks/use-capture-flow.ts` (updated): DB insertions in separate try/catch after audio try block. On success: sets `memoId` + `isProcessing: true`. On DB error: sets error string, preserves audio file.
- `src/components/capture/ProcessingScreen.tsx` (new): `ActivityIndicator` + connectivity-sensitive subtitle. Flat-edge, all-lowercase Space Mono.
- `src/app/(tabs)/capture.tsx` (updated): renders `ProcessingScreen` when `isProcessing && memoId`; FAB becomes 'check' proceed button when `hasRecorded && !isProcessing`; `useQueueProcessor()` activated.
- i18n (updated): `processingMemo`, `processingOnline`, `processingOffline` added to en/hi/gu.
- Validation: `npx tsc --noEmit` zero errors; `npm run lint` zero warnings.

### File List

- `gods-plan/src/db/queries/memos.ts` (new)
- `gods-plan/src/db/queries/queue.ts` (new)
- `gods-plan/src/services/stt.service.ts` (new)
- `gods-plan/src/stores/capture.store.ts` (updated)
- `gods-plan/src/hooks/use-queue-processor.ts` (new)
- `gods-plan/src/hooks/use-capture-flow.ts` (updated)
- `gods-plan/src/components/capture/ProcessingScreen.tsx` (new)
- `gods-plan/src/app/(tabs)/capture.tsx` (updated)
- `gods-plan/src/app/_layout.tsx` (updated — pre-existing import type fix)
- `gods-plan/src/constants/i18n/locales/en.json` (updated)
- `gods-plan/src/constants/i18n/locales/hi.json` (updated)
- `gods-plan/src/constants/i18n/locales/gu.json` (updated)
- `gods-plan/package.json` (updated — expo-network added)
- `gods-plan/package-lock.json` (updated)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Story created — ready-for-dev | bmad-create-story |
| 2026-06-13 | All tasks implemented — status set to review | claude-sonnet-4-6 |
