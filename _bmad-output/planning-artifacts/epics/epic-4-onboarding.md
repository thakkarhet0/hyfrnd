---
type: epic
epic_id: epic-4
title: "Epic 4: Onboarding"
description: >
  New user can select their language, understand the app's value, complete a real
  first capture loop, grant permissions at the right moment, and consent to data
  processing — all without friction or confusion.
status: planned
priority: 4
depends_on: [epic-1, epic-2]
frs_covered: [FR36, FR37, FR38, FR39, FR40, FR41]
ux_drs_covered: [UX-DR12, UX-DR15]
stories: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"]
input_documents:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics/index.md
agent_instructions: >
  Onboarding screens live in app/onboarding/. Each screen must be single-focus:
  one action, no progress bars, no step counters (UX-DR15). Language must be
  selected and i18n locale active before any copy appears. Permissions must be
  requested at the exact right moment — microphone at first record tap (Story 4.4),
  contacts at first link tap (Story 2.8, triggered during 4.4), notifications after
  first successful capture (Story 4.5). Never request permissions on cold open.
  Onboarding step must be persisted to SQLite so it survives app kill (Story 4.6).
  Story 4.3 (battery exemption) is Android-only — skip entirely on iOS.
---

# Epic 4: Onboarding

New user can select their language, understand the app's value, complete a real first capture loop, grant permissions at the right moment, and consent to data processing — all without friction or confusion.

---

## Story 4.1: Language Selection Screen

As a new user,
I want to choose my language before anything else,
So that every screen, button, and notification I see is in my language from the start.

**Acceptance Criteria:**

**Given** the app is launched for the first time
**When** the onboarding flow begins
**Then** the first screen shown is a language selection screen with Hindi, Gujarati, and English as options
**And** selecting a language sets the active i18n locale for the session and persists it to `app.store.ts`
**And** all subsequent onboarding screens use the selected language immediately (no restart required)
**And** the language selection screen has no English dependency — all three options are recognizable via their own script/label (NFR19)
**And** no progress indicator or step count is shown (UX-DR15)

---

## Story 4.2: Welcome Screen

As a new user,
I want to understand what the app does in one sentence,
So that I know what I'm about to try before I commit to the first capture.

**Acceptance Criteria:**

**Given** language is selected
**When** the welcome screen appears
**Then** a single headline is shown in the selected language (equivalent of "speak about someone. the app remembers.")
**And** a single CTA button ("let's try it" equivalent) advances to the next step
**And** there is no other content on the screen — single focus (UX-DR15)
**And** no progress bar or step indicator is shown

---

## Story 4.3: Android Battery Optimization Exemption Prompt

As a new user on Android,
I want to be guided to exempt the app from battery optimization before I'm asked for notification permission,
So that my daily nudges actually arrive on Xiaomi, Realme, and other OEM devices.

**Acceptance Criteria:**

**Given** the device is Android
**When** the battery optimization step is reached in onboarding
**Then** a plain-language explanation appears explaining why this is needed (notifications will be blocked without it)
**And** OEM-specific guidance is shown for Xiaomi MIUI, Realme UI, and OPPO ColorOS (UX-DR12)
**And** a "got it, let's continue" CTA advances without forcing the user to actually complete the settings change
**Given** the device is iOS
**Then** this step is skipped entirely

---

## Story 4.4: Scripted First Capture Loop

As a new user,
I want to complete a real capture — not a simulation — before leaving onboarding,
So that I see the app work for me before I've invested any trust in it.

**Acceptance Criteria:**

**Given** the onboarding welcome and battery steps are complete
**When** the first capture step begins
**Then** the capture screen appears with a prompt in the user's language equivalent of "tap and speak about someone you met today"
**And** the full capture flow from Epic 2 runs — real STT, real extraction, real contact link, real follow-up
**And** microphone permission is requested at this moment if not already granted (FR38), with a plain-language explanation shown before the system dialog
**And** if microphone permission is denied, a typed fallback is offered (no dead end)
**And** the onboarding step is marked complete only after extraction review is confirmed — not on recording alone
**And** `app.store.ts` records `onboarding_step: 'first_capture_complete'` on completion

---

## Story 4.5: Notification Permission and DPDP Consent

As a new user,
I want to grant notification permission after I've seen the app work,
So that when the system dialog appears, I already know what value I'm enabling.

**Acceptance Criteria:**

**Given** the first capture loop is complete (Story 4.4)
**When** the notification permission step runs
**Then** a plain-language explanation is shown first: "You captured one memory — let us remind you tomorrow" (equivalent in user's language)
**And** only after this explanation does `UNUserNotificationCenter.requestAuthorization()` / `POST_NOTIFICATIONS` fire (FR40)
**And** if the user denies, they proceed to the consent screen without error — denial is handled gracefully
**When** the DPDP consent screen appears
**Then** contacts access and STT audio processing are presented as separate consent items in plain language (FR41)
**And** consenting to STT processing sets `consent_state.stt_consent_granted = true` and `consent_version = 1`
**And** the user can proceed without granting STT consent — the app works without it (capture stores locally, no STT)
**And** onboarding is marked complete: `app.store.ts` sets `onboarding_complete: true`

---

## Story 4.6: Resumable Onboarding State

As a new user,
I want to be able to close the app mid-onboarding and pick up exactly where I left off,
So that I'm not forced to restart from the beginning if I get interrupted.

**Acceptance Criteria:**

**Given** a user has completed language selection and welcome but not first capture
**When** they close and reopen the app
**Then** they are taken directly to the first capture step — not back to language selection
**And** the previously selected language is still active
**Given** a user has completed all onboarding steps
**When** they open the app
**Then** they are taken directly to the main tab navigator — onboarding is not shown again
**And** `app.store.ts` `onboarding_step` is persisted to SQLite so it survives app kill
