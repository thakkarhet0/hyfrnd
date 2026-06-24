---
type: epic-index
project: "God's plan"
description: >
  Navigation index for AI agents. Start here before opening any epic file.
  Contains the full requirements inventory (FRs, NFRs, ARs, UX-DRs) and
  the complete epic list with file paths, dependencies, and story IDs.
input_documents:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
agent_instructions: >
  1. Read this index to orient yourself.
  2. Open the specific epic file(s) relevant to the story you are implementing.
  3. Cross-reference FRs and NFRs listed in this index when writing acceptance criteria.
  4. Read architecture.md in full before implementing any story.
  5. Never implement a story whose epic has unmet depends_on entries.
---

# God's plan — Epic Index

## Epics

| Epic | Title | File | Status | Depends On |
|------|-------|------|--------|------------|
| epic-1 | Project Foundation | [epic-1-project-foundation.md](epic-1-project-foundation.md) | planned | — |
| epic-2 | Core Capture Loop | [epic-2-core-capture-loop.md](epic-2-core-capture-loop.md) | planned | epic-1 |
| epic-3 | Contact Management | [epic-3-contact-management.md](epic-3-contact-management.md) | planned | epic-1, epic-2 |
| epic-4 | Onboarding | [epic-4-onboarding.md](epic-4-onboarding.md) | planned | epic-1, epic-2 |
| epic-5 | Follow-up & Notifications | [epic-5-followup-notifications.md](epic-5-followup-notifications.md) | planned | epic-1, epic-2 |
| epic-6 | Settings, Privacy & Compliance | [epic-6-settings-privacy-compliance.md](epic-6-settings-privacy-compliance.md) | planned | epic-1, epic-2 |
| epic-7 | Subscription & Payments | [epic-7-subscription-payments.md](epic-7-subscription-payments.md) | planned | epic-1, epic-2 |

---

## Requirements Inventory

### Functional Requirements

- FR1: User can record a voice memo from the capture screen
- FR2: User can initiate a capture session by tapping a daily nudge notification
- FR3: User can manually open the capture screen at any time without a notification
- FR4: System provides clear feedback to the user when voice recording begins and when it stops
- FR5: A capture session completes successfully regardless of network availability at the time of recording; STT processing occurs when connectivity allows
- FR6: System displays a processing state after recording stops and transitions the user to the extraction review screen once STT results are available
- FR7: System displays a visible pending status on a voice memo queued for STT processing and updates it to extracted or failed once processing completes
- FR8: System transcribes voice memos recorded in Hindi, Gujarati, English, and Hindi/Gujarati-English code-switched speech
- FR9: System presents extracted fields (contact name, context points, follow-up date and intent) to the user for review and confirmation before saving
- FR10: System extracts a contact name from an unstructured voice memo transcript
- FR11: System extracts 3–5 context points from a voice memo transcript
- FR12: System extracts a follow-up date and intent from a voice memo transcript
- FR13: System prompts the user to confirm or supply any extraction fields that could not be inferred, presenting one missing field at a time with the raw transcript as context, and accepts both typed and voice input for each response
- FR14: System stores the raw transcript locally if AI extraction fails, without silently discarding it
- FR15: System retries queued STT processing when network connectivity is restored
- FR16: User can link a voice memo extraction result to an existing contact from their device contacts
- FR17: System suggests potential matching contacts when linking a memo to help avoid duplicate entries
- FR18: User can create a new contact from a voice memo extraction result
- FR19: User can edit a contact's name, phone number, and profile photo at any time
- FR20: User can delete a single contact and all associated memos and follow-ups
- FR21: User can edit or delete individual extracted context points and add free-text notes to any memo after it has been saved
- FR22: User can search for contacts by name
- FR23: User can view a contact's full history of memo extractions and follow-ups
- FR24: User can view their full contact list with last-interaction date and next follow-up date
- FR25: System enforces a 10-contact limit on the free plan
- FR26: User can schedule a follow-up reminder for a contact with a specific date
- FR27: System delivers follow-up reminders with the contact name and associated context from the linked memo
- FR28: Tapping a follow-up reminder notification navigates the user to the contact's detail screen with the linked memo summary surfaced
- FR29: User can mark a follow-up as completed, moving it to the contact's history with a completion timestamp
- FR30: User can dismiss a pending follow-up reminder (marking it skipped) or reschedule it to a new date
- FR31: User can view all pending follow-ups in a list
- FR32: System sends three daily capture nudge notifications (morning, afternoon, evening)
- FR33: User can configure the timing window for each daily nudge within a ±2-hour range
- FR34: Notification tap navigates the user directly to the capture screen
- FR35: System presents a re-engagement prompt on next app open if the user has not launched the app in 3 or more days
- FR36: System guides a new user through a scripted first capture loop: record → STT extract → contact link → follow-up schedule
- FR37: System allows a user to exit onboarding mid-flow and resume from the same step on next app open
- FR38: System requests microphone permission at the moment of the user's first capture attempt
- FR39: System requests contacts permission at the moment of the user's first contact link attempt
- FR40: System requests notification permission after the user's first successful capture, not on cold open
- FR41: System presents a plain-language consent screen at onboarding disclosing contacts access and STT audio processing as separate consent items
- FR42: System gates STT audio processing on explicit user consent and stores the consent state locally
- FR43: User can delete all their data including any associated cloud backup from within the app
- FR44: System stores a consent version field in the local database to enable re-consent if data processing purposes change
- FR45: User can access the app's grievance officer contact from within app settings
- FR46: User can enable optional Google Drive backup via Google OAuth from within app settings
- FR47: System stores all voice memos, extracted notes, and contact data on-device by default with no server-side persistence
- FR48: System presents a paywall when a free-plan user attempts to add an 11th contact
- FR49: System preserves any in-progress capture data when a free-plan user triggers the paywall
- FR50: User can upgrade from the free plan to the unlimited plan via in-app purchase
- FR51: System processes subscription payments via Google Play Billing on Android and Apple IAP on iOS
- FR52: User can restore a previously purchased subscription from within the app
- FR53: User can view their current plan status and manage their subscription from app settings

### Non-Functional Requirements

- NFR1: Notification tap opens capture screen within 2 seconds on all target devices
- NFR2: STT transcription for 60-second memo completes within 5 seconds under normal network
- NFR3: AI extraction from completed transcript completes within 3 seconds
- NFR4: App cold-start time does not exceed 3 seconds on any target device
- NFR5: Contact list renders within 1 second for lists up to 500 contacts
- NFR6: Capture screen is interactive within 1 second of opening
- NFR7: All voice memos, extracted notes, and contact data encrypted at rest (AES-256/SQLCipher)
- NFR8: STT audio transmitted over HTTPS/TLS only; not persisted server-side after transcription
- NFR9: Google Drive backup stored in user's own Drive App Data folder only
- NFR10: App does not handle or transmit raw payment credentials
- NFR11: DPDP Act compliance before launch (consent records, consent_version, data deletion, grievance officer)
- NFR12: STT success ≥95% across primary and fallback providers combined
- NFR13: Daily nudges must deliver on Xiaomi MIUI, Realme UI, Samsung One UI, OnePlus OxygenOS
- NFR14: App functions fully in read-only mode with zero network connectivity
- NFR15: Google Drive backup sync retries automatically on connectivity restore
- NFR16: STT fallback to ElevenLabs STT activates within 5 seconds of Sarvam AI timeout
- NFR17: STT API provisioned for 2,000 requests/day (10 memos × 200 DAU)
- NFR18: SQLite performance does not degrade beyond 1,000 memo records per user
- NFR19: App operable by users with limited English literacy — icons and audio carry navigation
- NFR20: Voice input accepted as primary input modality for all capture and extraction confirmation flows
- NFR21: Body text minimum 16sp on all critical screens

### Architectural Requirements

- AR1: Project initialized with create-expo-app@latest with full dependency set (op-sqlite, Drizzle, Zustand, Sentry, PostHog, react-i18next, expo-auth-session, expo-splash-screen)
- AR2: SQLite database schema created with Drizzle; all migrations applied at app startup before first render (behind expo-splash-screen)
- AR3: SQLCipher encryption key generated on first launch and stored in expo-secure-store; key never leaves the device
- AR4: Drizzle Kit migration pipeline established; all schema changes via drizzle-kit generate, never hand-edit migrations folder
- AR5: EAS Build profiles configured (dev/preview/production) with environment secrets for all API keys
- AR6: GitHub Actions CI configured for automated builds on version tag push
- AR7: Sentry error tracking configured with source map upload in EAS post-build hook
- AR8: PostHog product analytics configured (capture completions, STT success/failure, paywall conversion events)
- AR9: STT accuracy spike — validate Sarvam AI ≥90% word accuracy on Hindi/Gujarati-English code-switching before any feature work proceeds
- AR10: i18n infrastructure (react-i18next) initialized with translation files for Hindi, Gujarati, and English

### UX Design Requirements

- UX-DR1: Record button implemented as a custom circle component — navy fill, mint icon, strong haptic on tap-start (mic live), soft haptic on tap-stop (memo captured)
- UX-DR2: Waveform animation component — teal (#7FC7D9), plays only during active recording, fades to still on stop
- UX-DR3: Processing screen — static pulsing teal waveform animation, lowercase "processing your memo" copy, transitions automatically to extraction review when complete
- UX-DR4: Extraction review card — lowercase "here's what i got" header, contact name + 3–5 context bullets + suggested follow-up date, "looks right" one-tap confirm all, raw transcript collapsible
- UX-DR5: Missing field prompt — one field at a time, raw transcript visible as context, voice input accepted (no typing required)
- UX-DR6: Contact linking screen — lowercase "is this [name]?" yes/no; 2–3 suggestions on multiple match; "save as new contact" with name pre-filled on no match
- UX-DR7: Capture complete screen — lowercase "[name] saved. follow-up on [date]." auto-advances home after 2 seconds; no completion haptic
- UX-DR8: All lowercase typography throughout (Space Mono) — labels, buttons, headings, notification copy; tracking +0.04em–+0.08em
- UX-DR9: Mint + Navy palette — light mode: #DCF2F1 bg / #0F1035 text / #365486 CTA / #7FC7D9 accent; dark mode inverted
- UX-DR10: Record button is the only circle (50% border-radius); all other surfaces flat edge (border-radius: 0) — cards, buttons, chips, FAB
- UX-DR11: 3-tab navigation (capture · contacts · settings) via Expo Router; tab bar always visible after onboarding
- UX-DR12: Android battery optimization exemption prompt shown before notification permission in onboarding — OEM-specific guidance for Xiaomi MIUI, Realme UI, OPPO
- UX-DR13: Paywall custom component — ₹400/month anchor pricing, 7-day free trial framing, plain copy, no countdown timers or false scarcity
- UX-DR14: Empty states with emotional weight — custom components, not generic "no data" messages
- UX-DR15: No progress bars or step indicators in onboarding — single-focus screens, one primary action per screen

### FR → Epic Coverage Map

| FR | Epic |
|----|------|
| FR1–FR7 | epic-2 |
| FR8–FR18 | epic-2 |
| FR19–FR24 | epic-3 |
| FR25 | epic-7 |
| FR26–FR35 | epic-5 |
| FR36–FR41 | epic-4 |
| FR42 | epic-2 |
| FR43–FR46 | epic-6 |
| FR44 | epic-1 (schema) |
| FR47 | epic-1 (architectural enforcement) |
| FR48–FR53 | epic-7 |
| AR1–AR10 | epic-1 |
| UX-DR1–UX-DR11 | epic-2 |
| UX-DR12, UX-DR15 | epic-4 |
| UX-DR13 | epic-7 |
| UX-DR14 | epic-3, epic-5 |
