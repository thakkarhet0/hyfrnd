# Story 2.7: Missing Field Prompt

Status: done

## Story

As a user,
I want to be asked one question at a time when something couldn't be understood,
So that correcting the memo feels like a conversation, not a form.

## Acceptance Criteria

1. **Given** one or more extraction fields are null **When** the user lands on the missing field screen **Then** only one missing field is presented at a time, in order: name → context → follow-up date (FR13)
2. **And** the raw transcript is visible as context while answering
3. **And** a microphone button accepts voice input for the answer (FR13, NFR20) — stub button acceptable in MVP (full voice re-recording is Epic 4+ work)
4. **And** a text input is also available as an alternative
5. **And** answering one field advances to the next missing field (if any), then to the extraction review card
6. **And** the screen uses single-focus layout — one question, one input, one action (UX-DR15 principle)

## Tasks / Subtasks

- [ ] Task 1: Create `src/app/missing-field.tsx` — missing field prompt screen (AC: 1–6)
  - [ ] Determine first missing field in order: name → context_points → follow_up_date
  - [ ] Show question for that field using existing i18n `extraction.namePrompt` / `contextPrompt` / `followUpPrompt`
  - [ ] Text input + submit button
  - [ ] Microphone icon button (stub — tapping shows "voice input coming soon" or just focuses text input)
  - [ ] Show raw transcript as context (load from DB via `getMemoTranscript`)
  - [ ] On submit: set field in store → advance to next missing field or `/extraction-review`
  - [ ] Single-focus layout: one question, one input area, one action

- [ ] Task 2: Update sprint-status.yaml

## Dev Notes

### Missing Field Order
Check: `extractedName === null` → ask name; then `extractedContextPoints === null` → ask context; then `extractedFollowUpDate === null` → ask follow-up. Navigate to `/extraction-review` once all missing fields are filled.

### Transcript
Load with `getMemoTranscript(memoId)` from `@/db/queries/memos`.

## Dev Agent Record

## File List

## Change Log
