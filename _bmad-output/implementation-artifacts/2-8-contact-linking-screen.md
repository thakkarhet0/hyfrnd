# Story 2.8: Contact Linking Screen

Status: done

## Story

As a user,
I want to confirm who I'm saving this memory about,
So that the memo is attached to the right person without duplicate contacts.

## Acceptance Criteria

1. **Given** extraction review is confirmed **When** the contact linking screen appears **Then** it displays lowercase "is this [extracted name]?" with yes/no options (UX-DR6)
2. **When** the user taps "yes" **Then** the memo is linked to the matched contact and the user advances to capture complete
3. **When** the system finds 2–3 potential matches **Then** all matches are shown as tappable chips; tapping one links the memo and advances
4. **When** the user taps "no" or no match is found **Then** "save as new contact" appears with the extracted name pre-filled
5. **And** tapping "save as new contact" creates a new row in `contacts` and links the memo
6. **And** `memos.status` is set to `'extracted'` on successful save (already done by queue processor; verify)
7. **And** expo-contacts device contacts access is requested here if not already granted (FR39) — stub: show button without actual device access in MVP

## Tasks / Subtasks

- [ ] Task 1: Add `insertContact` and `linkMemoToContact` to DB queries
  - [ ] Create `src/db/queries/contacts.ts`: `insertContact(data: { name: string }): Promise<{ data: string | null; error: Error | null }>` — INSERT into contacts, return new id
  - [ ] Add `updateMemoContact(memoId: string, contactId: string): Promise<{ data: null; error: Error | null }>` to `src/db/queries/memos.ts` — UPDATE memos SET contact_id WHERE id

- [ ] Task 2: Create `src/app/contact-linking.tsx` — contact linking screen (AC: 1–7)
  - [ ] Header: lowercase "is this [name]?" (UX-DR6)
  - [ ] Simple yes/no flow: "yes" → create/find contact → navigate to `/capture-complete`
  - [ ] "no" → show save-as-new with name pre-filled TextInput
  - [ ] "save as new contact" → insertContact → updateMemoContact → navigate to `/capture-complete`
  - [ ] Store linked contactId in capture store (`setLinkedContactId`)
  - [ ] All text lowercase Space Mono

- [ ] Task 3: Add `linkedContactId` to capture store

- [ ] Task 4: Update sprint-status.yaml

## Dev Notes

### DB Queries needed
```ts
// contacts.ts (new file)
insertContact({ name: string }) → { data: contactId | null, error }

// memos.ts (add)
updateMemoContact(memoId, contactId) → { data: null, error }
```

## Dev Agent Record

## File List

## Change Log
