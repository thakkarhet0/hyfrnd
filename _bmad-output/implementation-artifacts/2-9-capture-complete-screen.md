# Story 2.9: Capture Complete Screen

Status: done

## Story

As a user,
I want to see confirmation that my memory is saved and a follow-up is scheduled,
So that I can close the app knowing the relationship is taken care of.

## Acceptance Criteria

1. **Given** contact linking is complete **When** the capture complete screen appears **Then** it displays lowercase "[name] saved. follow-up on [date]." (UX-DR7)
2. **And** the screen auto-advances to the home (contacts tab) after 2 seconds
3. **And** no haptic fires on this screen — the stop-recording haptic was the ritual moment (UX-DR7)
4. **And** a PostHog `capture_complete` event fires with `{ language: string, had_missing_fields: bool, new_contact: bool }` — no names or transcript content
5. **And** the follow-up is written to the `follow_ups` table with `status: 'pending'` and the linked memo's context as `context_snapshot`

## Tasks / Subtasks

- [ ] Task 1: Add `insertFollowUp` to DB queries
  - [ ] Create `src/db/queries/follow-ups.ts`: `insertFollowUp(data: { contactId: string, memoId: string, dueDate: number, contextSnapshot: string | null }): Promise<{ data: string | null; error: Error | null }>`

- [ ] Task 2: Create `src/app/capture-complete.tsx` — capture complete screen (AC: 1–5)
  - [ ] Display "[name] saved. follow-up on [date]." — use `t('extraction.savedFollowUp', { name, date })`
  - [ ] useEffect on mount: insertFollowUp + track CAPTURE_COMPLETE event + setTimeout 2000ms → navigate to `/(tabs)/contacts`
  - [ ] Reset capture store after navigation
  - [ ] No haptics
  - [ ] All lowercase Space Mono

- [ ] Task 3: Update sprint-status.yaml

## Dev Notes

### Navigation after 2s
`router.replace('/(tabs)/contacts')` then `store.reset()`

### Analytics event
```ts
track(ANALYTICS_EVENTS.CAPTURE_COMPLETE, {
  language: useAppStore.getState().language,
  had_missing_fields: hadMissingFields, // stored in capture store
  new_contact: isNewContact, // stored in capture store
});
```
Note: 'language' is NOT in PII_KEYS so this is fine.

### Follow-up dueDate
Parse `extractedFollowUpDate` (ISO string) to unix ms timestamp. If no follow-up date, skip insertFollowUp or use +7 days as default.

## Dev Agent Record

## File List

## Change Log
