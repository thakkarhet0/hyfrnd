# Story 2.5: Claude Haiku Extraction Service

Status: done

## Story

As a user,
I want structured information pulled from my transcript automatically,
So that I don't have to fill in fields manually.

## Acceptance Criteria

1. **Given** a completed transcript in `memos.raw_transcript` **When** `extraction.service.ts` is called **Then** the transcript is sent to Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via HTTPS with the extraction prompt from `constants/extraction.ts`
2. **And** the response is parsed as JSON: `{ name: string | null, context_points: string[] | null, follow_up_date: string | null, follow_up_intent: string | null }`
3. **And** null fields indicate the model could not infer the value (triggers Story 2.7 missing field flow)
4. **And** the extraction completes within 3 seconds (NFR3)
5. **And** if extraction fails (API error or unparseable response), `memos.raw_transcript` is preserved and `memos.status` set to `'failed'` — no silent drop (FR14)
6. **And** a PostHog event is fired: `extraction_complete` with fields `{ success: bool, null_fields: string[] }` — no transcript content in event properties

## Tasks / Subtasks

- [ ] Task 1: Create `src/constants/extraction.ts` — prompt and result type (AC: 1, 2)
  - [ ] Export `ExtractionResult` interface: `{ name: string | null; context_points: string[] | null; follow_up_date: string | null; follow_up_intent: string | null }`
  - [ ] Export `EXTRACTION_PROMPT` function that takes transcript string and returns the system + user prompt for Claude Haiku
  - [ ] Prompt must instruct Claude to return ONLY valid JSON matching ExtractionResult shape; null for fields it cannot infer

- [ ] Task 2: Add `getMemoTranscript` to `src/db/queries/memos.ts` (AC: 1)
  - [ ] Export `getMemoTranscript(id: string): Promise<{ data: string | null; error: Error | null }>`
  - [ ] SELECT `raw_transcript` FROM `memos` WHERE `id`; return null if no row found
  - [ ] Follow existing `{ data, error }` pattern; never throw

- [ ] Task 3: Create `src/services/extraction.service.ts` — Claude Haiku call (AC: 1–6)
  - [ ] Export `ExtractionResult` re-exported from constants or typed inline
  - [ ] Export `extractFromTranscript(memoId: string): Promise<{ data: ExtractionResult | null; error: Error | null }>`
  - [ ] Call `getMemoTranscript(memoId)`; if error or null return `{ data: null, error }`
  - [ ] Build Claude Haiku request using raw `fetch` (NOT `@anthropic-ai/sdk` — NOT installed)
  - [ ] API: `POST https://api.anthropic.com/v1/messages`
  - [ ] Headers: `x-api-key: <claudeApiKey>`, `anthropic-version: 2023-06-01`, `content-type: application/json`
  - [ ] API key: `(Constants.expoConfig?.extra as Record<string, string>)?.claudeApiKey ?? ''`
  - [ ] Model: `claude-haiku-4-5-20251001`; max_tokens: 512
  - [ ] AbortController with 3-second timeout (NFR3)
  - [ ] Parse response: first content block of type "text"; JSON.parse; validate shape
  - [ ] On success: update capture store fields, track analytics event
  - [ ] On failure (timeout, API error, parse error): preserve transcript, return error

- [ ] Task 4: Update `src/stores/capture.store.ts` — add extraction result fields (AC: 2, 3)
  - [ ] Add to CaptureState: `extractedName: string | null`, `extractedContextPoints: string[] | null`, `extractedFollowUpDate: string | null`, `extractedFollowUpIntent: string | null`
  - [ ] Add setters: `setExtractedName`, `setExtractedContextPoints`, `setExtractedFollowUpDate`, `setExtractedFollowUpIntent`
  - [ ] Reset these fields in `reset()`
  - [ ] Initialize all extracted fields to null in initial state

- [ ] Task 5: Update `src/services/analytics.service.ts` — add EXTRACTION_COMPLETE event (AC: 6)
  - [ ] Add `EXTRACTION_COMPLETE: 'extraction_complete'` to `ANALYTICS_EVENTS`
  - [ ] 'name' is already in PII_KEYS guard — extraction event must NOT include transcript or name

- [ ] Task 6: Update `src/hooks/use-queue-processor.ts` — call extraction after STT success (AC: 1)
  - [ ] Import `extractFromTranscript` from `@/services/extraction.service`
  - [ ] After STT success branch: call `extractFromTranscript(item.memo_id)`
  - [ ] If extraction succeeds: update capture store extracted fields from result
  - [ ] If extraction fails: set `hasProcessingError(true)`, update memo status to 'failed'
  - [ ] Do NOT update memo status to 'extracted' until after extraction succeeds (move `updateMemoStatus(item.memo_id, 'extracted')` to after extraction success)

- [ ] Task 7: Update sprint-status.yaml — mark 2-5 as review

## Dev Notes

### Tech Stack
- React Native + Expo SDK 56, TypeScript strict mode
- Drizzle ORM + op-sqlite (SQLCipher encrypted SQLite)
- Zustand for stores
- PostHog for analytics

### Critical: Raw Fetch for Claude (NOT SDK)
`@anthropic-ai/sdk` is NOT installed in this project. Use raw `fetch`:
```ts
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': claudeApiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  }),
  signal: controller.signal,
});
```

### API Key Access
```ts
const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
const claudeApiKey = extra?.claudeApiKey ?? '';
```

### Claude Response Shape
```ts
interface ClaudeResponse {
  content: { type: string; text: string }[];
  stop_reason: string;
}
```

### ExtractionResult Type
```ts
export interface ExtractionResult {
  name: string | null;
  context_points: string[] | null;
  follow_up_date: string | null;
  follow_up_intent: string | null;
}
```

### Queue Processor Logic (IMPORTANT ordering change)
Current flow: STT success → `updateMemoStatus('extracted')` → done
New flow with extraction:
1. STT success → `updateQueueItemStatus('completed')` 
2. Call `extractFromTranscript(item.memo_id)`
3. Extraction success → `updateMemoStatus('extracted')` + store extracted fields
4. Extraction failure → `updateMemoStatus('failed')` + `setHasProcessingError(true)`

### Service Return Pattern
All async functions return `{ data, error }`, never throw.

### Analytics: PII Guard
The `ANALYTICS_EVENTS.EXTRACTION_COMPLETE` event fires with `{ success: bool, null_fields: string[] }`.
Never include transcript, name, or contact in event properties — PII_KEYS guard in `track()` blocks these.

### 3-Second Timeout
```ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 3000);
try {
  // fetch call
} finally {
  clearTimeout(timeoutId);
}
```

### ESLint Rule: Array Types
Use `string[]` not `Array<string>`. The project has `@typescript-eslint/array-type` rule enforcing `T[]` style.

## Dev Agent Record

### Implementation Plan
- Create extraction constants with prompt + type
- Add getMemoTranscript to memos.ts
- Create extraction service with raw Claude fetch
- Update capture store with extraction fields
- Add EXTRACTION_COMPLETE analytics event
- Wire extraction call into queue processor after STT
- Mark story complete in sprint-status.yaml

### Debug Log

### Completion Notes

## File List

## Change Log
