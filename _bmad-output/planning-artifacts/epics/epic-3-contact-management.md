---
type: epic
epic_id: epic-3
title: "Epic 3: Contact Management"
description: >
  User can view their full contact list, search for a contact, see a contact's
  complete history, and edit or delete any contact or memo detail.
status: planned
priority: 3
depends_on: [epic-1, epic-2]
frs_covered: [FR19, FR20, FR21, FR22, FR23, FR24, FR31]
ux_drs_covered: [UX-DR14]
stories: ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"]
input_documents:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics/index.md
agent_instructions: >
  Contact list and detail screens are read-heavy — query Drizzle directly from
  hooks, never mirror DB data into Zustand stores. Delete operations must cascade
  (contacts → memos → context_points → follow_ups → stt_queue rows + scheduled
  notifications). All empty states require custom emotional copy (UX-DR14), not
  generic "no data" messages. Contact list must meet the 1s render NFR5.
---

# Epic 3: Contact Management

User can view their full contact list, search for a contact, see a contact's complete history, and edit or delete any contact or memo detail.

---

## Story 3.1: Contacts List Screen

As a user,
I want to see all my contacts with their last interaction date and next follow-up at a glance,
So that I know who needs attention without opening each contact.

**Acceptance Criteria:**

**Given** at least one contact exists
**When** the contacts tab is opened
**Then** all contacts are displayed in a list sorted by next follow-up date (soonest first), then by last interaction date (most recent first)
**And** each row shows: contact name, last interaction date, next follow-up date (if any)
**And** the list renders within 1 second for up to 500 contacts (NFR5)
**And** all text is minimum 16sp (NFR21)
**Given** no contacts exist
**When** the contacts tab is opened
**Then** an emotionally weighted empty state is shown — custom copy, not generic "no contacts" (UX-DR14)

---

## Story 3.2: Contact Detail Screen with Memo History

As a user,
I want to tap a contact and see everything I know about them,
So that I can prepare for a conversation or review our history.

**Acceptance Criteria:**

**Given** the user taps a contact in the list
**When** the contact detail screen opens
**Then** the contact's name, phone number, and photo (if set) are displayed
**And** a chronological list of all memo extractions is shown, most recent first (FR23)
**And** each memo row shows: date, 3–5 context bullets, follow-up intent
**And** pending and completed follow-ups are listed below the memo history
**And** the screen is navigable via `app/contact/[id].tsx`

---

## Story 3.3: Edit Contact

As a user,
I want to update a contact's name, phone number, or photo,
So that my contact records stay accurate.

**Acceptance Criteria:**

**Given** the contact detail screen is open
**When** the user taps the edit action
**Then** an edit form opens with name, phone, and photo fields pre-filled (FR19)
**And** the photo field opens the device camera via expo-camera (requesting permission if needed)
**And** saving updates the `contacts` row and re-renders the detail screen
**And** cancelling discards all changes

---

## Story 3.4: Delete Contact with Cascade

As a user,
I want to delete a contact and have all their associated data removed,
So that I have full control over what's stored about my relationships.

**Acceptance Criteria:**

**Given** the contact detail screen is open
**When** the user initiates delete
**Then** a confirmation prompt appears naming the contact and stating all memos and follow-ups will be deleted
**When** the user confirms
**Then** the `contacts` row is deleted
**And** all associated `memos`, `context_points`, `follow_ups`, and `stt_queue` rows are cascade-deleted (FR20)
**And** any scheduled notification for this contact's follow-ups is cancelled
**And** the user is navigated back to the contacts list

---

## Story 3.5: Contact Search

As a user,
I want to search for a contact by name,
So that I can find who I'm looking for instantly even with a large list.

**Acceptance Criteria:**

**Given** the contacts tab is open
**When** the user taps the search input and types a name
**Then** the contact list filters in real time to show only contacts whose names match the query (case-insensitive) (FR22)
**And** results update within 300ms of each keystroke
**And** clearing the search restores the full sorted list
**And** an empty-state message appears if no matches are found

---

## Story 3.6: Edit Context Points and Add Free-Text Notes

As a user,
I want to correct or add to what was extracted from my voice memo after saving,
So that I can keep a contact's context accurate over time.

**Acceptance Criteria:**

**Given** the user is viewing a memo in the contact detail screen
**When** the user taps a context point
**Then** the context point becomes editable inline (FR21)
**And** the user can edit the text or delete the context point
**And** the user can add a new free-text note to any memo from the same screen
**And** all changes persist immediately to `context_points`
**And** voice input is accepted for new notes (NFR20)
