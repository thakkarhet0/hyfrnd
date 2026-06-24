---
type: epic
epic_id: epic-5
title: "Epic 5: Follow-up & Notifications"
description: >
  User receives context-rich follow-up reminders at the right time, can act on them
  (complete/snooze/reschedule), and receives daily capture nudges that build the habit.
status: planned
priority: 5
depends_on: [epic-1, epic-2]
frs_covered: [FR2, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35]
ux_drs_covered: [UX-DR14]
stories: ["5.1", "5.2", "5.3", "5.4", "5.5", "5.6"]
input_documents:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics/index.md
agent_instructions: >
  All notifications are local — no server dependency (NFR14). On Android, use
  WorkManager via expo-notifications to ensure delivery on MIUI/Realme UI/One UI/
  OxygenOS (NFR13). Notification tap must open capture or contact detail within
  2 seconds (NFR1). Never use streak language or guilt framing in any notification
  or prompt copy. Empty states need emotional weight (UX-DR14). Story 6.1
  (notification timing configuration) in epic-6 depends on the scheduling
  infrastructure established in Story 5.5.
---

# Epic 5: Follow-up & Notifications

User receives context-rich follow-up reminders at the right time, can act on them (complete/snooze/reschedule), and receives daily capture nudges that build the habit.

---

## Story 5.1: Follow-up Scheduling from Capture

As a user,
I want to set a follow-up date for a contact right after capturing a memory,
So that I never have to remember to schedule it separately.

**Acceptance Criteria:**

**Given** the capture complete screen is displayed (Story 2.9)
**When** a follow-up date was extracted or suggested during extraction review
**Then** the follow-up is written to `follow_ups` with the confirmed date, `status: 'pending'`, and a `context_snapshot` from the linked memo (FR26)
**When** no follow-up date was extracted
**Then** a date picker (Paper `DatePickerModal`) is shown before the capture complete screen
**And** the user can skip scheduling — capture completes without a follow-up if skipped
**And** calendar permission is requested when first scheduling a follow-up (FR39 equivalent for calendar)

---

## Story 5.2: Follow-up Reminder Notification with Context

As a user,
I want to receive a notification on the day of a follow-up that reminds me what it's about,
So that I know exactly what to say before I make the call.

**Acceptance Criteria:**

**Given** a follow-up with `status: 'pending'` and a future due date exists
**When** the due date arrives (morning, device local time)
**Then** a local notification fires via expo-notifications with the contact name and `context_snapshot` text (FR27)
**And** the notification copy surfaces the specific context — not just the contact name
**When** the user taps the notification
**Then** the app opens to the contact detail screen with the linked memo summary at the top (FR28)
**And** the navigation completes within 2 seconds of tap (NFR1)
**And** the notification fires locally — no server dependency (NFR14)

---

## Story 5.3: Follow-up Actions (Complete, Snooze, Reschedule)

As a user,
I want to mark a follow-up done, snooze it, or move it to a new date,
So that my follow-up list stays accurate without friction.

**Acceptance Criteria:**

**Given** a pending follow-up is visible (in contact detail or follow-ups list)
**When** the user marks it complete
**Then** `follow_ups.status` is set to `'completed'` and `completed_at` is recorded (FR29)
**And** the follow-up moves to the contact's history section
**When** the user dismisses/skips a follow-up
**Then** `follow_ups.status` is set to `'skipped'` — no negative framing in the UI (FR30)
**When** the user reschedules a follow-up
**Then** a date picker opens and the new date replaces the old due date
**And** the local notification for the old date is cancelled and a new one is scheduled

---

## Story 5.4: Follow-ups List Screen

As a user,
I want a single screen showing all my pending follow-ups,
So that I can see at a glance who I need to get back to.

**Acceptance Criteria:**

**Given** the app is open
**When** the user navigates to the follow-ups list via `app/(tabs)/contacts/followups.tsx` (rendered as a sub-screen within the contacts tab, reachable from a "see all follow-ups" link on the contacts list screen)
**Then** all `follow_ups` with `status: 'pending'` are shown, sorted by due date ascending (FR31)
**And** each row shows: contact name, due date, context snapshot summary
**And** tapping a row navigates to the contact detail screen
**Given** no pending follow-ups exist
**Then** an emotionally weighted empty state is shown (UX-DR14)

---

## Story 5.5: Three Daily Nudge Notifications

As a user,
I want to receive a morning, afternoon, and evening capture nudge each day,
So that the capture habit is built through gentle, consistent prompts.

**Acceptance Criteria:**

**Given** notification permission has been granted
**When** the app schedules daily nudges
**Then** three local notifications are scheduled via expo-notifications: morning (~8 AM), afternoon (~1 PM), evening (~9 PM) in the user's local timezone (FR32)
**And** each notification uses the correct copy for the user's language from `constants/notifications.ts`
**And** tapping any nudge opens the capture screen directly (FR34)
**And** on Android, WorkManager is used for scheduling to ensure delivery across OEM battery management systems (NFR13)
**And** on first launch (after notification permission), the app guides Xiaomi MIUI and Realme UI users to whitelist the app in battery settings (NFR13)
**And** nudges are rescheduled automatically each day — no server dependency (NFR14)

---

## Story 5.6: Re-engagement Prompt on 3-Day Absence

As a user,
I want the app to gently surface a pending follow-up when I return after a few days away,
So that the habit can restart without me needing to remember where I left off.

**Acceptance Criteria:**

**Given** the user has not opened the app in 3 or more days
**When** the app is opened
**Then** a re-engagement prompt is shown before the main tab navigator (FR35)
**And** the prompt surfaces the most recent pending follow-up (if any), or suggests making a new capture
**And** the prompt has a neutral dismiss option — no streak language, no guilt framing
**And** dismissing the prompt takes the user directly to the contacts tab
**And** the 3-day threshold is tracked by storing `last_app_open` timestamp in `app.store.ts`
