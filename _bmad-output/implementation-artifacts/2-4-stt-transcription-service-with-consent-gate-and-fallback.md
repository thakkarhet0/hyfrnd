# Story 2.4: STT Transcription Service with Consent Gate and Fallback

Status: done

## Story

As a user,
I want my voice memo transcribed accurately in my language within 5 seconds,
So that I don't have to wait or type.

## Acceptance Criteria

1. **Given** a queued audio file and `consent_state.stt_consent_granted = true` **When** `stt.service.ts` processes the queue item **Then** the audio is sent to Sarvam AI via HTTPS (NFR8) with the correct language code from the user's selected locale
2. **And** the transcription response is stored in `memos.raw_transcript`
3. **And** the total round-trip completes within 5 seconds for a 60-second memo (NFR2)
4. **Given** `consent_state.stt_consent_granted = false` **When** `stt.service.ts` is called **Then** the call is blocked — no audio leaves the device — and the memo is flagged for manual entry
5. **And** the consent gate check happens inside `stt.service.ts`, not in any UI component (Critical Invariant 2)
6. **Given** Sarvam AI times out or returns an error **When** the failure is detected within 5 seconds **Then** the request is retried once on ElevenLabs STT (NFR16)
7. **And** if both providers fail, the raw audio is preserved and `memos.status` is set to `'failed'` (FR14)
8. **And** the user is shown a retry option — never a dead end

## Tasks / Subtasks

- [x] Task 1: Create `src/db/queries/consent.ts` — read consent state (AC: 4, 5)
  - [x] Import `getDb`, `consent_state` schema
  - [x] Export `getSttConsentGranted(): Promise<{ data: boolean; error: Error | null }>` — SELECT from `consent_state` WHERE `id = 1`; return `stt_consent_granted === 1`; if no row found, return `{ data: false, error: null }` (no consent = blocked by default)
  - [x] Follow service return pattern: `{ data, error }`, never throw

- [x] Task 2: Create `src/stores/app.store.ts` — language preference (AC: 1)
  - [x] Import `LanguageCode`, `DEFAULT_LANGUAGE` from `@/constants/languages`
  - [x] Export `useAppStore` with `create<AppState>` from `zustand`
  - [x] State: `language: LanguageCode` (initial: `DEFAULT_LANGUAGE` = `'hi'`)
  - [x] Action: `setLanguage(lang: LanguageCode): void`
  - [x] **IMPORTANT:** This is a minimal stub — Epic 4 (Onboarding) will expand this store significantly. Do NOT add fields beyond `language` + `setLanguage` in this story.

- [x] Task 3: Update `src/db/queries/memos.ts` — add updateMemoTranscript (AC: 2)
  - [x] Add `updateMemoTranscript(id: string, transcript: string): Promise<{ data: null; error: Error | null }>` — UPDATE `memos` SET `raw_transcript = transcript` WHERE `id`
  - [x] Follow existing `{ data, error }` pattern; never throw

- [x] Task 4: Replace stub `src/services/stt.service.ts` — full implementation (AC: 1–8)
  - [x] Keep existing `QueueItem` interface and `processQueueItem` function signature unchanged
  - [x] `processQueueItem` implementation:
    - [x] **Consent gate (Critical Invariant 2):** Call `getSttConsentGranted()`; if `data === false` or `error`, return `{ data: null, error: new Error('stt_consent_not_granted') }` immediately — no audio leaves device
    - [x] Get language: `useAppStore.getState().language` to get the `LanguageCode`; map to Sarvam code via `SUPPORTED_LANGUAGES[lang].sarvamCode`
    - [x] Call `transcribeWithSarvam(item.audio_path, sarvamCode)` with 5s timeout
    - [x] If Sarvam succeeds: call `updateMemoTranscript(item.memo_id, transcript)`, return `{ data: transcript, error: null }`
    - [x] If Sarvam fails: call `transcribeWithElevenLabs(item.audio_path, elevenLabsCode)` with fresh 5s timeout
    - [x] If ElevenLabs succeeds: call `updateMemoTranscript(item.memo_id, transcript)`, return `{ data: transcript, error: null }`
    - [x] If both fail: return `{ data: null, error: combinedError }` — caller (queue processor) handles memo status
  - [x] Implement `async function transcribeWithSarvam(audioPath: string, languageCode: string): Promise<string>` (throws on failure):
    - [x] Read API key: `(Constants.expoConfig?.extra as Record<string,string>)?.sarvamApiKey ?? ''`
    - [x] Build FormData: `file` field with `{ uri: audioPath, type: 'audio/m4a', name: 'memo.m4a' }`, `language_code`, `model: 'saarika:v2'`
    - [x] Use `AbortController` with `setTimeout(5000)` for timeout
    - [x] `fetch('https://api.sarvam.ai/speech-to-text', { method: 'POST', headers: { 'api-subscription-key': key }, body: formData, signal })`
    - [x] Check `response.ok` — if not, throw `new Error(\`Sarvam AI error: \${response.status}\`)`
    - [x] Parse response: `const { transcript } = await response.json()` — throw if no transcript
    - [x] Clear timeout with `clearTimeout` after `fetch` resolves
  - [x] Implement `async function transcribeWithElevenLabs(audioPath: string, languageCode: string): Promise<string>` (throws on failure):
    - [x] Read API key: `elevenLabsApiKey`
    - [x] Build FormData: `audio` field with `{ uri: audioPath, type: 'audio/m4a', name: 'memo.m4a' }`, `model_id: 'scribe_v1'`
    - [x] 5s AbortController timeout
    - [x] `fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': key }, body: formData, signal })`
    - [x] Parse response: `const { text } = await response.json()` — return `text`

- [x] Task 5: Update `src/hooks/use-queue-processor.ts` — handle consent-blocked result (AC: 4, 8)
  - [x] In `drainQueue`, check the error from `processQueueItem`: if `error.message === 'stt_consent_not_granted'`, update queue item status to `'failed'` and memo status to `'failed'` but do NOT show a standard failure — this is an expected consent state
  - [x] (Future: consent-blocked memos will be surfaced differently in Epic 6; for now just set to failed)

- [x] Task 6: Update `src/app/(tabs)/capture.tsx` — retry option for failed memos (AC: 8)
  - [x] Import `useCaptureStore`
  - [x] When `isProcessing` is false AND memo failed (detected via `error` state from `useCaptureFlow`): show `t('capture.processingFailed')` + a retry `Pressable` that calls `tryDrainIfConnected()`
  - [x] Add a `hasProcessingError: boolean` field to `useCaptureStore` and `setHasProcessingError(b: boolean)` action
  - [x] In `use-queue-processor.ts` `drainQueue`: on error, call `store.setHasProcessingError(true)` + `store.setIsProcessing(false)`
  - [x] In capture.tsx: render error + retry when `hasProcessingError && !isProcessing && memoId`
  - [x] Reset `hasProcessingError` to false when `tryDrainIfConnected` is called (retry starts)

- [x] Task 7: Update i18n locale files (AC: 8)
  - [x] `en.json`: add `capture.processingFailed: "transcription failed"`, `capture.retryProcessing: "try again"`
  - [x] `hi.json`: `"ट्रांसक्रिप्शन विफल हुआ"`, `"फिर से प्रयास करें"`
  - [x] `gu.json`: `"ટ્રાન્સક્રિપ્શન નિષ્ફળ ગઈ"`, `"ફરી પ્રયાસ કરો"`

- [x] Task 8: Validate (AC: all)
  - [x] Run `npx tsc --noEmit` in `gods-plan/` — zero errors
  - [x] Run `npm run lint` in `gods-plan/` — zero warnings

## Dev Notes

**CRITICAL: Read `https://docs.expo.dev/versions/v56.0.0/` before writing any code (per AGENTS.md).**

### What Story 2.3 Built (Do Not Break)

- `src/db/queries/memos.ts` — `insertMemo`, `updateMemoStatus`
- `src/db/queries/queue.ts` — `insertQueueItem`, `updateQueueItemStatus`, `getPendingQueueItems`
- `src/services/stt.service.ts` — stub `QueueItem` + `processQueueItem` (REPLACE implementation, keep interface)
- `src/stores/capture.store.ts` — `memoId`, `isProcessing`, `setMemoId`, `setIsProcessing`, `reset()`
- `src/hooks/use-queue-processor.ts` — `drainQueue`, `tryDrainIfConnected`; sets `store.setIsProcessing(false)` on completion
- `src/components/capture/ProcessingScreen.tsx` — shows while `isProcessing`

### Critical Invariants

1. **Consent gate (Critical Invariant 2):** The `getSttConsentGranted()` check MUST be the first thing `processQueueItem` does. If consent is false, return immediately — no file read, no FormData, no fetch. Gate is in `stt.service.ts`, never in UI.
2. **Service return pattern:** `processQueueItem` returns `{ data, error }`, never throws. The inner `transcribeWithSarvam` / `transcribeWithElevenLabs` helpers CAN throw — `processQueueItem` catches them.
3. **No silent drops (Critical Invariant 4):** If both providers fail, return `{ data: null, error }`. Caller (`use-queue-processor.ts` `drainQueue`) already sets memo status to `'failed'`. The audio file remains on disk.
4. **`updateMemoTranscript` called only on success** — do not call it on failure.

### Sarvam AI API (confirmed in Story 1.7)

```
POST https://api.sarvam.ai/speech-to-text
Header: api-subscription-key: <SARVAM_API_KEY>
Body: multipart/form-data
  file: <audio binary>         ← field name is "file"
  language_code: hi-IN | gu-IN | en-IN
  model: saarika:v2
Response: { transcript: string, language_code: string, disfluencies: boolean }
```

Language codes (from `src/constants/languages.ts`):
- `'hi'` → `'hi-IN'`
- `'gu'` → `'gu-IN'`
- `'en'` → `'en-IN'`
- Code-switched: use primary language code (saarika:v2 handles mixing)

### ElevenLabs STT API (confirmed in Story 1.7)

```
POST https://api.elevenlabs.io/v1/speech-to-text
Header: xi-api-key: <ELEVENLABS_API_KEY>
Body: multipart/form-data
  audio: <audio binary>        ← field name is "audio" (NOT "file")
  model_id: scribe_v1
Response: { text: string, words: [...] }
```

ElevenLabs language: pass `languageCode` as `language` field in FormData to hint the language, though scribe_v1 auto-detects — include it for accuracy.

### API Keys from app.config.ts

```ts
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
const SARVAM_API_KEY = extra?.sarvamApiKey ?? '';
const ELEVENLABS_API_KEY = extra?.elevenLabsApiKey ?? '';
```

Keys are set in `.env.local` as `SARVAM_API_KEY` and `ELEVENLABS_API_KEY` and exposed via `app.config.ts` `extra` field.

### FormData with Audio File in React Native

React Native's `FormData.append` does NOT accept `Blob` for file uploads. Use the React Native file object pattern:

```ts
const formData = new FormData();
formData.append('file', {
  uri: audioPath,        // the permanent path from use-capture-flow
  type: 'audio/m4a',
  name: 'memo.m4a',
} as unknown as Blob);  // TypeScript cast required — RN handles this at runtime
formData.append('language_code', sarvamCode);
formData.append('model', 'saarika:v2');
```

**Do NOT** use `expo-file-system` to read the file into a buffer before uploading — just pass the URI directly in FormData. React Native's fetch implementation handles file:// URI natively.

### AbortController Timeout Pattern (5s)

```ts
async function transcribeWithSarvam(audioPath: string, languageCode: string): Promise<string> {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const key = extra?.sarvamApiKey ?? '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const formData = new FormData();
    formData.append('file', { uri: audioPath, type: 'audio/m4a', name: 'memo.m4a' } as unknown as Blob);
    formData.append('language_code', languageCode);
    formData.append('model', 'saarika:v2');

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': key },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Sarvam AI error: ${response.status}`);

    const json = (await response.json()) as { transcript?: string };
    if (!json.transcript) throw new Error('Sarvam AI returned no transcript');
    return json.transcript;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Why `finally` for clearTimeout:** prevents the timer from firing after a successful response (which would abort a future request sharing the same controller). The `finally` block runs whether the fetch succeeds, fails, or throws.

### Zustand `getState()` for Non-Hook Context

`processQueueItem` runs inside an async queue processor, not a React component. To read Zustand state outside a React component:

```ts
import { useAppStore } from '@/stores/app.store';

// Inside a regular async function (not a hook):
const language = useAppStore.getState().language;
```

This is the standard Zustand pattern for non-React contexts — `getState()` is a static method on the store instance.

### consent_state Table Notes

The `consent_state` table uses a singleton pattern: single row with `id = 1`. On first launch (before Onboarding/Epic 4 sets consent), the row may not exist. `getSttConsentGranted` handles this:

```ts
export async function getSttConsentGranted(): Promise<{ data: boolean; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({ stt_consent_granted: consent_state.stt_consent_granted })
      .from(consent_state)
      .where(eq(consent_state.id, 1))
      .limit(1);
    if (rows.length === 0) return { data: false, error: null }; // no consent row = not granted
    return { data: rows[0].stt_consent_granted === 1, error: null };
  } catch (err) {
    return { data: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
```

### app.store.ts Minimal Shape

```ts
import { create } from 'zustand';
import { DEFAULT_LANGUAGE, LanguageCode } from '@/constants/languages';

interface AppState {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

export const useAppStore = create<AppState>((set) => ({
  language: DEFAULT_LANGUAGE,
  setLanguage: (language) => set({ language }),
}));
```

Epic 4 (Onboarding) will add `stt_consent_granted`, `onboarding_complete`, etc. — don't pre-add those fields now.

### use-queue-processor.ts Changes for Consent Error

Current `drainQueue` in Story 2.3:
```ts
if (error) {
  await updateQueueItemStatus(item.id, 'failed');
  await updateMemoStatus(item.memo_id, 'failed');
} else {
  await updateQueueItemStatus(item.id, 'completed');
  await updateMemoStatus(item.memo_id, 'extracted');
}
store.setIsProcessing(false);
```

Story 2.4 adds consent-blocked path + error state:
```ts
if (error) {
  await updateQueueItemStatus(item.id, 'failed');
  await updateMemoStatus(item.memo_id, 'failed');
  // Notify UI of failure so retry button is shown
  store.setHasProcessingError(true);
} else {
  await updateQueueItemStatus(item.id, 'completed');
  await updateMemoStatus(item.memo_id, 'extracted');
  store.setHasProcessingError(false);
}
store.setIsProcessing(false);
```

(Consent-blocked and network-failure both land in the same `error` branch — both show the retry button. This is acceptable for Epic 2; Epic 6 will distinguish consent-blocked from transient failures.)

### capture.tsx Retry UI (when hasProcessingError)

```tsx
{/* Error + retry — shown after processing fails */}
{hasProcessingError && !isProcessing && memoId && (
  <View style={styles.center}>
    <Text style={[styles.hint, { color: theme.text }]}>{t('capture.processingFailed')}</Text>
    <Pressable
      onPress={() => {
        store.setHasProcessingError(false);
        store.setIsProcessing(true);
        void tryDrainIfConnected();
      }}
      style={styles.reRecordButton}
    >
      <Text style={[styles.reRecordLabel, { color: theme.cta }]}>{t('capture.retryProcessing')}</Text>
    </Pressable>
  </View>
)}
```

This must render INSTEAD of `ProcessingScreen` (which shows when `isProcessing`), not alongside it.

### File Structure for This Story

```
gods-plan/src/
├── db/queries/
│   ├── memos.ts              ← UPDATE: add updateMemoTranscript
│   └── consent.ts            ← NEW
├── stores/
│   └── app.store.ts          ← NEW
├── services/
│   └── stt.service.ts        ← UPDATE: replace stub with full implementation
├── stores/capture.store.ts   ← UPDATE: add hasProcessingError, setHasProcessingError
├── hooks/
│   └── use-queue-processor.ts ← UPDATE: consent error handling + setHasProcessingError
├── app/(tabs)/capture.tsx    ← UPDATE: retry UI for failed processing
└── constants/i18n/locales/
    ├── en.json               ← UPDATE: 2 new keys
    ├── hi.json               ← UPDATE: 2 new keys
    └── gu.json               ← UPDATE: 2 new keys
```

### References

- [Source: epics/epic-2-core-capture-loop.md — Story 2.4 ACs, NFR2, NFR8, NFR16, FR14]
- [Source: architecture.md — Critical Invariant 2 (consent gate in stt.service.ts)]
- [Source: architecture.md — Service Return Pattern: { data, error }, never throw]
- [Source: 1-7-stt-accuracy-validation-spike.md — Sarvam AI + ElevenLabs API details, confirmed endpoints]
- [Source: gods-plan/src/constants/languages.ts — SUPPORTED_LANGUAGES, language codes]
- [Source: gods-plan/app.config.ts — API keys via extra.sarvamApiKey, extra.elevenLabsApiKey]
- [Source: 2-3-audio-persistence-and-stt-queue.md — QueueItem interface contract, drainQueue pattern]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues — tsc and lint passed clean on first attempt.

### Completion Notes List

- `src/db/queries/consent.ts` (new): `getSttConsentGranted()` reads singleton consent_state row; handles missing row as false.
- `src/stores/app.store.ts` (new): minimal `useAppStore` with `language: LanguageCode`, `setLanguage`. Default `'hi'`.
- `src/db/queries/memos.ts` (updated): added `updateMemoTranscript(id, transcript)`.
- `src/services/stt.service.ts` (updated — full implementation): `processQueueItem` checks consent first, gets language from `useAppStore.getState()`, calls Sarvam AI with 5s AbortController, falls back to ElevenLabs on failure. Stores transcript via `updateMemoTranscript` on success.
- `src/stores/capture.store.ts` (updated): added `hasProcessingError` + `setHasProcessingError`; `reset()` clears it.
- `src/hooks/use-queue-processor.ts` (updated): calls `store.setHasProcessingError(true/false)` in drainQueue.
- `src/app/(tabs)/capture.tsx` (updated): renders error + retry UI when `hasProcessingError && !isProcessing && memoId`.
- i18n (updated): `processingFailed`, `retryProcessing` added to en/hi/gu.
- Validation: `npx tsc --noEmit` zero errors; `npm run lint` zero warnings.

### File List

- `gods-plan/src/db/queries/consent.ts` (new)
- `gods-plan/src/stores/app.store.ts` (new)
- `gods-plan/src/db/queries/memos.ts` (updated)
- `gods-plan/src/services/stt.service.ts` (updated)
- `gods-plan/src/stores/capture.store.ts` (updated)
- `gods-plan/src/hooks/use-queue-processor.ts` (updated)
- `gods-plan/src/app/(tabs)/capture.tsx` (updated)
- `gods-plan/src/constants/i18n/locales/en.json` (updated)
- `gods-plan/src/constants/i18n/locales/hi.json` (updated)
- `gods-plan/src/constants/i18n/locales/gu.json` (updated)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-13 | Story created — ready-for-dev | bmad-create-story |
| 2026-06-13 | All tasks implemented — status set to review | claude-sonnet-4-6 |
