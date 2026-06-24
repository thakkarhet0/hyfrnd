---
type: epic
epic_id: epic-1
title: "Epic 1: Project Foundation"
description: >
  Developer can initialize, run, build, and deploy the app with all core infrastructure
  in place — encrypted database, i18n, observability, and STT accuracy validated —
  ready for feature development.
status: planned
priority: 1
depends_on: []
frs_covered: [FR44, FR47]
ars_covered: [AR1, AR2, AR3, AR4, AR5, AR6, AR7, AR8, AR9, AR10]
stories: ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"]
input_documents:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics/index.md
agent_instructions: >
  This epic must be completed before any other epic begins. All stories here are
  infrastructure — no user-facing features. Story 1.7 (STT spike) is a hard gate:
  if word accuracy < 90%, block all feature work and escalate before proceeding.
  Story 1.3 (encryption) must be complete before any data write in any later story.
---

# Epic 1: Project Foundation

Developer can initialize, run, build, and deploy the app with all core infrastructure in place — encrypted database, i18n, observability, and STT accuracy validated — ready for feature development.

---

## Story 1.1: Project Initialization and App Shell

As a developer,
I want the project initialized with all dependencies and a working 3-tab app shell,
So that all future stories have a consistent, runnable foundation to build on.

**Acceptance Criteria:**

**Given** a clean machine with Node.js and EAS CLI installed
**When** the initialization commands are run
**Then** the project is created with `create-expo-app@latest` using TypeScript strict mode
**And** all dependencies are installed: `@op-engineering/op-sqlite`, `drizzle-orm`, `drizzle-kit`, `zustand`, `nanoid`, `react-native-paper`, `@sentry/react-native`, `posthog-react-native`, `react-i18next`, `i18next`, `expo-notifications`, `expo-contacts`, `expo-calendar`, `expo-av`, `expo-haptics`, `expo-secure-store`, `expo-camera`, `expo-auth-session`, `expo-splash-screen`
**And** ESLint (`eslint-config-expo`) and Prettier are configured
**And** `app.config.ts` is created with placeholder EAS secret slots for all API keys
**And** `eas.json` defines dev, preview, and production profiles
**And** Expo Router is configured with a 3-tab layout: `capture`, `contacts`, `settings`
**And** all three tabs render a placeholder screen with the correct tab label
**And** `npx expo start` runs without errors on iOS simulator and Android emulator

---

## Story 1.2: Database Schema and Migration Pipeline

As a developer,
I want the complete Drizzle schema defined and the migration pipeline established,
So that all stories can write to a typed, versioned database from day one.

**Acceptance Criteria:**

**Given** Story 1.1 is complete
**When** `db/schema.ts` is created with all tables
**Then** the schema defines: `contacts`, `memos`, `context_points`, `follow_ups`, `stt_queue`, `consent_state` with the correct columns and types
**And** `consent_state` includes a `consent_version INTEGER` column (FR44)
**And** `drizzle.config.ts` points to the schema and migrations folder
**And** `drizzle-kit generate` produces the initial migration file in `db/migrations/`
**And** `db/index.ts` opens the op-sqlite database, loads the SQLCipher key from expo-secure-store, and runs all pending migrations
**And** `app/_layout.tsx` calls `db/index.ts` before any screen renders, behind `expo-splash-screen`
**And** the app cold-starts and all migrations apply without error on a fresh install

---

## Story 1.3: Encryption and Secure Key Management

As a developer,
I want SQLCipher encryption active with a device-bound key,
So that all user data is encrypted at rest from the first write (NFR7).

**Acceptance Criteria:**

**Given** Story 1.2 is complete
**When** the app launches for the first time
**Then** a unique SQLCipher key is generated using a cryptographically secure method
**And** the key is stored in expo-secure-store under a fixed key name
**And** the op-sqlite database is opened with this key (not with the default unencrypted config)
**When** the app relaunches
**Then** the existing key is retrieved from expo-secure-store and the database opens successfully
**And** the database file is not readable as plaintext when inspected directly
**And** no key material appears in logs or error messages

---

## Story 1.4: i18n Infrastructure and Language Files

As a developer,
I want react-i18next initialized with translation files for Hindi, Gujarati, and English,
So that all copy in the app can be language-gated from the first story that uses text.

**Acceptance Criteria:**

**Given** Story 1.1 is complete
**When** i18n is initialized in the app root
**Then** `react-i18next` is configured with `i18next` and initialized before any screen renders
**And** translation files exist at `constants/locales/en.json`, `hi.json`, `gu.json`
**And** each file contains at minimum: capture screen labels, processing copy, extraction review labels, notification copy (morning/afternoon/evening nudges), and common action labels (confirm, cancel, save, delete)
**And** all copy in the app shell (tab labels, placeholder screens) uses `t('key')` — no hardcoded strings
**And** switching the active language at runtime updates all visible copy without restart
**And** the Sarvam AI language code mapping is defined in `constants/languages.ts` for each supported locale

---

## Story 1.5: EAS Build Configuration and CI Pipeline

As a developer,
I want EAS Build profiles and a GitHub Actions CI workflow configured,
So that preview and production builds are reproducible and triggered automatically on release tags.

**Acceptance Criteria:**

**Given** Story 1.1 is complete and a GitHub repository exists
**When** a version tag (e.g. `v1.0.0`) is pushed to the main branch
**Then** the GitHub Actions workflow triggers an EAS production build
**And** EAS secrets (Claude API key, Sarvam AI key, ElevenLabs STT key, PostHog key) are injected at build time via `eas.json` environment config — never committed to the repo
**And** `eas build --profile preview` produces an installable `.apk` / `.ipa` for internal testing
**And** `eas build --profile production` produces a store-ready build
**And** `.env.example` documents all required environment variables with placeholder values

---

## Story 1.6: Observability Setup (Sentry + PostHog)

As a developer,
I want Sentry crash reporting and PostHog analytics initialized,
So that errors are captured in production and product usage is measurable from first launch.

**Acceptance Criteria:**

**Given** Story 1.1 is complete and Sentry + PostHog projects are created
**When** the app initializes
**Then** Sentry is initialized with the DSN from EAS secrets and captures unhandled JS errors and native crashes
**And** source maps are uploaded to Sentry as part of the EAS production build via a post-build hook
**And** PostHog is initialized with the project API key from EAS secrets
**And** a `capture_complete` event is defined in the PostHog event schema (to be fired in Epic 2)
**And** no user PII (names, transcripts, contact data) appears in any Sentry error payload or PostHog event property
**And** both integrations are disabled or set to a test project in the dev EAS profile

---

## Story 1.7: STT Accuracy Validation Spike

As a developer,
I want Sarvam AI's transcription accuracy validated on real Hindi/Gujarati-English code-switched audio before any feature work begins,
So that the ≥90% word accuracy gate (PRD technical success criteria) is confirmed before the core capture loop is built.

**Acceptance Criteria:**

**Given** a Sarvam AI API key is provisioned
**When** a set of ≥10 test audio samples is submitted (covering: pure Gujarati, pure Hindi, English, Gujarati-English mix, Hindi-English mix, noisy environment, fast speech)
**Then** word accuracy is measured against known transcripts for each sample
**And** the overall word accuracy across all samples is ≥90%
**And** average transcription latency for a 60-second sample is measured and confirmed under 5 seconds (NFR2)
**And** the ElevenLabs STT fallback is tested and confirmed as a working alternative
**And** results are documented in `docs/spikes/stt-accuracy.md`; if accuracy is below 90%, the finding blocks feature work and requires a provider re-evaluation before proceeding
**And** Sarvam AI API quota is confirmed at ≥2,000 transcription requests/day and documented in `docs/spikes/stt-accuracy.md` (NFR18); if quota cannot be provisioned at this level before launch, it is treated as a blocker equivalent to accuracy failure
