---
type: epic
epic_id: epic-6
title: "Epic 6: Settings, Privacy & Compliance"
description: >
  User can manage consent, configure backup, adjust notification timing, delete all
  their data, and access compliance information — with full DPDP compliance enforced.
status: planned
priority: 6
depends_on: [epic-1, epic-2]
frs_covered: [FR33, FR43, FR44, FR45, FR46]
stories: ["6.1", "6.2", "6.3", "6.4"]
input_documents:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics/index.md
agent_instructions: >
  Story 6.1 (notification timing) depends on the scheduling infrastructure from
  epic-5 Story 5.5 — implement 5.5 first. Story 6.2 (Drive backup) uses
  expo-auth-session with Drive App Data scope only (NFR9) — no access to personal
  Drive files. Token stored in expo-secure-store. Story 6.3 data deletion is a
  DPDP hard requirement: must cascade to all local data AND Google Drive if enabled,
  then reset to onboarding. Story 6.4 iOS PrivacyInfo.xcprivacy is a store submission
  blocker — do not skip it. No dark patterns anywhere in settings (no ambiguous
  toggles, no hidden deletion flows).
---

# Epic 6: Settings, Privacy & Compliance

User can manage consent, configure backup, adjust notification timing, delete all their data, and access compliance information — with full DPDP compliance enforced.

---

## Story 6.1: Notification Timing Configuration

As a user,
I want to adjust when each daily nudge arrives,
So that the reminders fit my schedule rather than interrupting it.

**Acceptance Criteria:**

**Given** the settings tab is open
**When** the user opens notification settings
**Then** sliders or time pickers for morning, afternoon, and evening nudge times are shown (FR33)
**And** each nudge time can be adjusted within a ±2-hour window from the default (8 AM / 1 PM / 9 PM)
**And** saving the new times cancels the existing scheduled notifications and reschedules them at the new times
**And** changes take effect within the same day if saved before the next notification time

---

## Story 6.2: Google Drive Backup

As a user,
I want to optionally back up my data to my own Google Drive,
So that I don't lose everything if I change phones.

**Acceptance Criteria:**

**Given** the settings tab is open
**When** the user taps "enable backup"
**Then** Google OAuth is initiated via `expo-auth-session` requesting Drive App Data scope (FR46)
**And** on successful OAuth, backup is enabled and a full sync runs immediately
**And** the backup stores data in the user's Drive App Data folder — not accessible to the app server (NFR9)
**And** sync retries automatically on next app foreground if the previous sync failed (NFR15)
**And** a plain-language disclosure is shown before OAuth: "your data will be saved to your Google Drive — only you can access it"
**When** the user disables backup
**Then** the OAuth token is revoked and no further syncs occur

---

## Story 6.3: Consent Management and Data Deletion

As a user,
I want to see and change my consent settings, and delete all my data if I choose,
So that I am in complete control of my information (DPDP compliance).

**Acceptance Criteria:**

**Given** the settings tab is open
**When** the user opens consent and privacy settings
**Then** the current STT consent status is displayed with a toggle to revoke or re-grant (FR42)
**And** toggling STT consent off sets `consent_state.stt_consent_granted = false`; future STT calls are blocked immediately
**When** the user taps "delete all my data"
**Then** a confirmation prompt explains: all contacts, memos, follow-ups, and voice files will be permanently deleted
**And** if Google Drive backup is enabled, the Drive App Data is also deleted (FR43)
**And** on confirmation, all local database rows are deleted, all audio files are removed from device storage, the SQLCipher key is rotated, and the Drive backup is cleared
**And** the app resets to the onboarding flow after deletion is complete

---

## Story 6.4: Grievance Officer and App Store Compliance

As a user,
I want to access the app's grievance officer contact from within the app,
So that I can raise data concerns as required under the DPDP Act (FR45, NFR11).

**Acceptance Criteria:**

**Given** the settings tab is open
**When** the user scrolls to the legal section
**Then** the grievance officer email is displayed and tappable (opens mail app) (FR45)
**And** a link to the Privacy Policy is present
**And** the app version and build number are displayed
**Given** the app is submitted to stores
**Then** the iOS PrivacyInfo.xcprivacy file declares all API usage: contacts, calendar, microphone, notifications
**And** the App Store privacy nutrition label accurately reflects: identity-linked contacts, usage data, diagnostics
**And** the Play Store listing includes a live Privacy Policy URL and the grievance officer email
