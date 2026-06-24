---
type: epic
epic_id: epic-2
title: "Epic 2: Core Capture Loop"
description: >
  User can record a voice memo in any language, have it transcribed and structured,
  link it to a contact, and see it saved with a follow-up date — completing the full
  core habit loop.
status: planned
priority: 2
depends_on: [epic-1]
frs_covered: [FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR42]
ux_drs_covered: [UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR6, UX-DR7, UX-DR8, UX-DR9, UX-DR10, UX-DR11]
stories: ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9"]
input_documents:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics/index.md
agent_instructions: >
  This is the highest-priority user-facing epic — the entire product depends on it.
  Three critical invariants from architecture.md apply to every story here:
  (1) Audio-first: audio written to disk before any navigation or state change.
  (2) Consent gate: stt_consent_granted checked inside stt.service.ts, never in UI.
  (3) Contact count check: freemium gate fires at contact-link step (Story 2.8),
      never during or before recording. Read architecture.md Critical Invariants
      section before implementing any story in this epic.
  TWO-PHASE NOTE FOR STORY 2.8: The paywall trigger AC (11th contact → paywall)
  requires Epic 7 (Stories 7.1 and 7.2) to be complete before it can be fully
  verified. During Epic 2 implementation, stub the paywall path with a
  console.warn('PAYWALL_STUB: contact limit reached') and a placeholder screen.
  Mark the paywall AC as pending-Epic-7. Revisit and complete during Epic 7.
---

# Epic 2: Core Capture Loop

User can record a voice memo in any language, have it transcribed and structured, link it to a contact, and see it saved with a follow-up date — completing the full core habit loop.

---

## Story 2.1: Design System Tokens and Capture Screen Shell

As a user,
I want the app to feel visually distinct and immediately trustworthy from the first screen I see,
So that the capture ritual feels intentional, not administrative.

**Acceptance Criteria:**

**Given** Story 1.1 is complete
**When** the design tokens are applied to the app
**Then** the Mint + Navy palette is configured: light mode `#DCF2F1` bg / `#0F1035` text / `#365486` CTA / `#7FC7D9` accent (UX-DR9)
**And** dark mode uses the inverted palette
**And** Space Mono is loaded as the sole font family; all text is lowercase (UX-DR8)
**And** all spacing uses 8px base unit multiples; screen padding is 24px
**And** all surface components (cards, buttons, chips) use `borderRadius: 0` — flat edge only (UX-DR10)
**And** the capture tab screen renders a centered record button placeholder and a "+" FAB
**And** the 3-tab bar is visible with correct icons for capture, contacts, settings (UX-DR11)
**And** all text on the capture screen meets the 16sp body minimum (NFR21)

---

## Story 2.2: Record Button, Audio Recording, and Haptic Feedback

As a user,
I want to tap a button to start and stop recording my voice memo,
So that the capture ritual feels physical and intentional.

**Acceptance Criteria:**

**Given** the capture screen is open
**When** the user taps the record button
**Then** a strong haptic fires (mic live signal) (UX-DR1)
**And** the teal waveform animation begins playing (UX-DR2)
**And** `expo-av` begins recording audio to a temporary file path
**And** the record button changes visual state to indicate active recording
**When** the user taps the record button again (stop)
**Then** a soft haptic fires (memo captured signal) (UX-DR1)
**And** the waveform animation fades to still (UX-DR2)
**And** `expo-av` stops recording and the audio file is written to permanent storage via FileSystem — **this write happens before any navigation or state transition** (Critical Invariant 1)
**And** a "re-record" option is available before the user proceeds
**And** the record button is the only circle element on screen (50% border-radius); all other elements are flat-edge (UX-DR10)

---

## Story 2.3: Audio Persistence and STT Queue

As a user,
I want my voice memo to be safe even if my phone dies or I lose internet immediately after recording,
So that I never lose a memory I just captured.

**Acceptance Criteria:**

**Given** the audio file has been written to permanent storage (Story 2.2 complete)
**When** the user stops recording
**Then** a row is inserted into the `stt_queue` table with `status: 'pending'`, the audio file path, and the memo_id
**And** a row is inserted into `memos` with `status: 'pending'` (FR7)
**And** the memo status is visible as "processing" in any memo list view
**When** the device has network connectivity at this moment
**Then** the STT queue processor immediately picks up the pending item and begins transcription
**When** the device has no network connectivity
**Then** the queue item remains with `status: 'pending'`
**And** the app transitions to the processing screen showing the pending state (FR5)
**When** connectivity is restored while the app is in the foreground
**Then** the queue processor retries and processes the pending item (FR15)
**And** the memo status updates to `extracted` or `failed` accordingly (FR7)

---

## Story 2.4: STT Transcription Service with Consent Gate and Fallback

As a user,
I want my voice memo transcribed accurately in my language within 5 seconds,
So that I don't have to wait or type.

**Acceptance Criteria:**

**Given** a queued audio file and `consent_state.stt_consent_granted = true`
**When** `stt.service.ts` processes the queue item
**Then** the audio is sent to Sarvam AI via HTTPS (NFR8) with the correct language code from the user's selected locale
**And** the transcription response is returned and stored in `memos.raw_transcript`
**And** the total round-trip completes within 5 seconds for a 60-second memo (NFR2)
**Given** `consent_state.stt_consent_granted = false`
**When** `stt.service.ts` is called
**Then** the call is blocked — no audio leaves the device — and the memo is flagged for manual entry
**And** the consent gate check happens inside `stt.service.ts`, not in any UI component (Critical Invariant 2)
**Given** Sarvam AI times out or returns an error
**When** the failure is detected within 5 seconds
**Then** the request is retried once on ElevenLabs STT (NFR16)
**And** if both providers fail, the raw audio is preserved and `memos.status` is set to `'failed'` (FR14)
**And** the user is shown a retry option — never a dead end

---

## Story 2.5: Claude Haiku Extraction Service

As a user,
I want structured information pulled from my transcript automatically,
So that I don't have to fill in fields manually.

**Acceptance Criteria:**

**Given** a completed transcript in `memos.raw_transcript`
**When** `extraction.service.ts` is called
**Then** the transcript is sent to Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) via HTTPS with the extraction prompt from `constants/extraction.ts`
**And** the response is parsed as JSON: `{ name: string | null, context_points: string[] | null, follow_up_date: string | null, follow_up_intent: string | null }`
**And** null fields indicate the model could not infer the value (triggers Story 2.7 missing field flow)
**And** the extraction completes within 3 seconds (NFR3)
**And** if extraction fails (API error or unparseable response), `memos.raw_transcript` is preserved and `memos.status` set to `'failed'` — no silent drop (FR14)
**And** a PostHog event is fired: `extraction_complete` with fields `{ success: bool, null_fields: string[] }` — no transcript content in event properties

---

## Story 2.6: Extraction Review Card

As a user,
I want to see what the app understood from my memo and confirm it in one tap,
So that I trust the app is working correctly without feeling like I'm filling in a form.

**Acceptance Criteria:**

**Given** extraction is complete with at least a name and one context point
**When** the extraction review screen appears
**Then** it displays lowercase "here's what i got" as the header (UX-DR4)
**And** the contact name, 3–5 context bullets, and suggested follow-up date are displayed in a flat-edge card
**And** a "looks right" button confirms all fields at once and advances to contact linking
**And** the raw transcript is available collapsed below the card — visible on tap, not by default
**And** individual fields are tappable for inline correction (voice or typed input accepted)
**And** corrections are applied without leaving the screen
**And** all text is lowercase Space Mono, minimum 16sp (NFR21)

---

## Story 2.7: Missing Field Prompt

As a user,
I want to be asked one question at a time when something couldn't be understood,
So that correcting the memo feels like a conversation, not a form.

**Acceptance Criteria:**

**Given** one or more extraction fields are null
**When** the user lands on the missing field screen
**Then** only one missing field is presented at a time, in order: name → context → follow-up date (FR13)
**And** the raw transcript is visible as context while answering
**And** a microphone button accepts voice input for the answer (FR13, NFR20)
**And** a text input is also available as an alternative — not required
**And** answering one field advances to the next missing field (if any), then to the extraction review card
**And** the screen uses single-focus layout — one question, one input, one action (UX-DR15 principle)

---

## Story 2.8: Contact Linking Screen

As a user,
I want to confirm who I'm saving this memory about,
So that the memo is attached to the right person without duplicate contacts.

**Acceptance Criteria:**

**Given** extraction review is confirmed
**When** the contact linking screen appears
**Then** it displays lowercase "is this [extracted name]?" with yes/no options (UX-DR6)
**When** the user taps "yes"
**Then** the memo is linked to the matched contact and the user advances to capture complete
**When** the system finds 2–3 potential matches
**Then** all matches are shown as tappable chips; tapping one links the memo and advances
**When** the user taps "no" or no match is found
**Then** "save as new contact" appears with the extracted name pre-filled
**And** tapping "save as new contact" creates a new row in `contacts` and links the memo
**And** expo-contacts device contacts access is requested here if not already granted (FR39)
**And** the contact count check runs here — if this would create an 11th contact, the paywall is triggered (Epic 7) — not during recording (Critical Invariant 3)
**And** `memos.status` is set to `'extracted'` on successful save

---

## Story 2.9: Capture Complete Screen

As a user,
I want to see confirmation that my memory is saved and a follow-up is scheduled,
So that I can close the app knowing the relationship is taken care of.

**Acceptance Criteria:**

**Given** contact linking is complete
**When** the capture complete screen appears
**Then** it displays lowercase "[name] saved. follow-up on [date]." (UX-DR7)
**And** the screen auto-advances to the home (contacts tab) after 2 seconds
**And** no haptic fires on this screen — the stop-recording haptic was the ritual moment (UX-DR7)
**And** a PostHog `capture_complete` event fires with `{ language: string, had_missing_fields: bool, new_contact: bool }` — no names or transcript content
**And** the follow-up is written to the `follow_ups` table with `status: 'pending'` and the linked memo's context as `context_snapshot`
