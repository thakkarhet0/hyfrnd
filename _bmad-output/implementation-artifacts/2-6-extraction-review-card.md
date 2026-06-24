# Story 2.6: Extraction Review Card

Status: done

## Story

As a user,
I want to see what the app understood from my memo and confirm it in one tap,
So that I trust the app is working correctly without feeling like I'm filling in a form.

## Acceptance Criteria

1. **Given** extraction is complete with at least a name and one context point **When** the extraction review screen appears **Then** it displays lowercase "here's what i got" as the header (UX-DR4)
2. **And** the contact name, 3–5 context bullets, and suggested follow-up date are displayed in a flat-edge card
3. **And** a "looks right" button confirms all fields at once and advances to contact linking
4. **And** the raw transcript is available collapsed below the card — visible on tap, not by default
5. **And** individual fields are tappable for inline correction (voice or typed input accepted)
6. **And** corrections are applied without leaving the screen
7. **And** all text is lowercase Space Mono, minimum 16sp (NFR21)

## Tasks / Subtasks

- [ ] Task 1: Add `isExtractionComplete` flag to `capture.store.ts` and navigation trigger in `capture.tsx`
  - [ ] Add `isExtractionComplete: boolean` to CaptureState, setter `setIsExtractionComplete`, default false, reset to false
  - [ ] In `use-queue-processor.ts`: after extraction success, call `store.setIsExtractionComplete(true)`
  - [ ] In `capture.tsx`: add useEffect watching `isExtractionComplete` — navigate to `/missing-field` if name or contextPoints is null, else navigate to `/extraction-review`

- [ ] Task 2: Add i18n keys for extraction review and contact linking screens
  - [ ] Add to all three locale files (en, hi, gu): `extraction.heresWhatIGot`, `extraction.looksRight`, `extraction.transcript`, `extraction.followUpOn`, `extraction.editField`

- [ ] Task 3: Create `src/app/extraction-review.tsx` — review card screen (AC: 1–7)
  - [ ] Header: lowercase "here's what i got" (UX-DR4), Space Mono Bold 24sp
  - [ ] Flat-edge card (borderRadius: 0) with: name row, context_points list, follow-up date row
  - [ ] "looks right" primary button → navigate to `/contact-linking`
  - [ ] Collapsed transcript section: shows "transcript" label, tap to expand
  - [ ] Each field row tappable → shows inline TextInput for correction
  - [ ] All text lowercase, min 16sp (NFR21)
  - [ ] Reads from `useCaptureStore`

- [ ] Task 4: Update sprint-status.yaml

## Dev Notes

### Navigation Pattern
- Expo Router Stack screens under `src/app/`
- Navigate: `import { router } from 'expo-router'; router.push('/extraction-review');`
- Already in `_layout.tsx`: `<Stack screenOptions={{ headerShown: false }} />`

### Design System
```ts
Typography.heading = { fontFamily: FONT_BOLD, fontSize: 24, ... textTransform: 'lowercase' }
Typography.body = { fontFamily: FONT_REGULAR, fontSize: 16, ... textTransform: 'lowercase' }
// All text lowercase Space Mono, min 16sp
```

### Store Fields Available
After extraction: `extractedName`, `extractedContextPoints`, `extractedFollowUpDate`, `extractedFollowUpIntent` — all in `useCaptureStore`.

## Dev Agent Record

### Implementation Plan

### Debug Log

### Completion Notes

## File List

## Change Log
