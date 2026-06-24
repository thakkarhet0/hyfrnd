---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-05-27'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
project_name: "God's plan"
user_name: 'God'
date: '2026-05-27'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
53 FRs across 8 domains:
- **Capture & Recording (7):** Core voice memo loop with offline queue and pending status tracking
- **STT & AI Extraction (8):** Multilingual transcription (Hindi, Gujarati, code-switching), structured extraction of name/context/follow-up, one-field-at-a-time correction flow, voice input accepted at every step
- **Contact Management (10):** Device contact linking, duplicate detection, 10-contact free limit enforcement, full history view
- **Follow-up & Scheduling (6):** Context-rich reminders, snooze/reschedule/complete lifecycle
- **Notifications & Nudges (4):** 3 daily nudges with configurable ±2hr windows, re-engagement on 3-day absence
- **Onboarding (5):** Scripted first-capture loop, resumable mid-flow, permissions requested at first-use moment
- **Privacy/Consent/Compliance (7):** Granular STT consent gate, DPDP data-deletion flow, consent_version field, Google Drive optional backup, grievance officer contact
- **Subscription & Payments (6):** Google Play Billing + Apple IAP, paywall fires mid-capture after extraction (audio already on disk), capture preserved if upgrade declined

**Non-Functional Requirements:**
- **Performance:** Notification tap → capture screen <2s; STT <5s (60s memo); AI extraction <3s; cold start <3s; contact list <1s (500 contacts); capture screen interactive <1s
- **Security:** AES-256 at rest (SQLCipher); HTTPS/TLS for STT only; no server-side memo/note persistence; DPDP compliant before launch
- **Reliability:** STT success ≥95% across primary + fallback combined; notifications must deliver on MIUI/Realme UI/One UI/OxygenOS without manual battery exemption; full offline read mode; Sarvam → ElevenLabs STT fallback within 5s
- **Scalability:** Provision STT quota for 2,000 requests/day at launch (10 memos × 200 DAU); SQLite must not degrade beyond 1,000 memo records
- **Accessibility:** No screen requires English literacy — icons + audio carry navigation (Prayag persona); voice = equal input at every step; 16sp body minimum; no fixed-height text containers (Hindi/Gujarati expand 40–60%)

**Scale & Complexity:**
- Primary domain: Cross-platform mobile (React Native + Expo)
- Complexity level: Medium — multilingual STT pipeline is the architectural load-bearer; everything else is relatively standard mobile CRUD + offline-first patterns
- Estimated architectural components: ~8 (audio pipeline, STT/AI layer, local DB, contact sync, notification scheduler, backup/sync, payment/subscription, consent management)

### Technical Constraints & Dependencies

- **Mandatory stack:** React Native + Expo managed workflow, EAS Build, Expo Router
- **STT providers:** Sarvam AI (primary, HTTP API from JS layer), ElevenLabs STT (fallback) — no native module
- **Storage:** SQLite + SQLCipher for on-device encrypted storage; expo-secure-store for keys/tokens
- **Payments:** Google Play Billing (Android) / Apple IAP (iOS) — no Razorpay or external payment links on iOS
- **Backup:** Google Drive App Data folder via Google OAuth — user's own Drive, no app server access
- **Notifications:** expo-notifications → FCM (Android) / APNS (iOS); WorkManager scheduling on Android
- **Solo founder constraint:** Architecture must be maintainable by one person — no exotic infra, no self-hosted services, minimal ops surface
- **No backend by default:** On-device is the default data path. The only outbound network calls are STT HTTP requests and optional Google Drive sync

### Cross-Cutting Concerns Identified

1. **Offline-first data flow** — audio is always written to disk at tap-stop; STT/extraction are async with queue; contacts/follow-ups/memos all readable offline; reminder notifications fire locally with no server dependency
2. **Multilingual STT pipeline** — async processing, two-provider failover, offline queue, raw transcript fallback, configurable per-user language preference gating all STT calls and copy
3. **Consent gates as code paths** — `stt_consent_granted` flag gates every outbound audio call; `consent_version` must be checked at app start; data-deletion flow must reach Google Drive if enabled — these are enforced invariants, not UI-only
4. **Audio persistence invariant** — audio written to disk before any navigation, paywall, or state transition; OEM process-kill must not lose a memo
5. **Notification reliability on Indian OEMs** — WorkManager scheduling; battery optimization exemption prompt during onboarding (Android); re-engagement prompt on 3-day absence
6. **Freemium gate enforcement** — contact count checked at contact-link step, not at capture; paywall fires after extraction review with capture already safe; upgrade restores seamlessly
7. **Encryption at rest** — SQLCipher wraps all memo, note, and contact data; expo-secure-store holds encryption keys; backup is Google-managed key via Drive App Data

## Starter Template Evaluation

### Primary Technology Domain

Cross-platform mobile app — React Native + Expo managed workflow, mandated by PRD.

### Starter Options Considered

No evaluation needed — the PRD specifies the full stack: React Native + Expo managed workflow, EAS Build, Expo Router. The only decision is the exact init command.

`create-expo-app@latest` (default template) is the correct starting point — it ships with:
- Expo Router (file-based routing) as the default navigation layer
- TypeScript pre-configured
- `app/` directory structure with tab layout scaffold

### Selected Starter: create-expo-app (default template)

**Rationale:** Mandated by PRD. Default template includes Expo Router + TypeScript, which aligns with all PRD requirements. No custom template needed.

**Initialization Command:**

```bash
npx create-expo-app@latest gods-plan
cd gods-plan
npx expo install expo-notifications expo-contacts expo-calendar expo-av \
1  expo-haptics expo-secure-store expo-camera expo-auth-session expo-splash-screen
npm install @op-engineering/op-sqlite drizzle-orm drizzle-kit zustand nanoid \
  react-native-paper @sentry/react-native posthog-react-native \
  react-i18next i18next
npm install --save-dev eslint-config-expo prettier
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript — configured by default. Strict mode recommended given solo founder maintainability.

**Routing:**
Expo Router (file-based). Screen files live in `app/`. 3-tab layout: `capture`, `contacts`, `settings`.

**Build Tooling:**
EAS Build for production. Metro bundler for dev. `app.json` / `app.config.ts` for configuration.

**Testing Framework:**
Jest + `@testing-library/react-native` — add post-init. Not included in default template.

**Code Organization:**
```
app/                  # Expo Router screens (file-based routes)
  (tabs)/             # Tab navigator
    capture.tsx
    contacts.tsx
    settings.tsx
components/           # Shared UI components
services/             # STT, AI extraction, backup, payments
db/                   # SQLite schema, queries, migrations
hooks/                # Custom React hooks
```

**Development Experience:**
Expo Go for rapid dev iteration; EAS Build for OEM-specific notification testing (Xiaomi/Realme battery optimization must be tested on real devices, not simulator).

**Note:** Project initialization using this command should be the first implementation story.

### Future Backend Considerations (Vision Phase)

Remaining on-device by default throughout MVP and Growth phases. When Vision-phase features require it, introduce a minimal serverless layer (Cloudflare Workers or Vercel Edge — not a full Supabase backend, which would conflict with the privacy-by-architecture stance):

- **STT API key proxy** — proxy Sarvam AI / ElevenLabs STT calls server-side to avoid shipping API keys in the app binary
- **Payment webhook verification** — server-side receipt validation for Google Play Billing and Apple IAP
- **ML inference** — relationship risk prediction, drift detection, and commute mode recommendations (Vision phase) will require server-side model inference

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):**
- SQLite client + ORM — gates all data layer work
- AI extraction provider — gates the core capture loop
- Offline queue persistence strategy — gates STT pipeline reliability

**Important (shape architecture):**
- State management library
- Error tracking + analytics

**Deferred to Vision Phase:**
- Serverless backend (STT key proxy, payment webhooks, ML inference)
- Server-side subscription verification

---

### Data Architecture

**SQLite Client:** `@op-engineering/op-sqlite` (latest)
Full SQLCipher encryption support — required for AES-256 at rest. Fastest SQLite implementation for React Native. expo-sqlite excluded: no built-in SQLCipher support.

**ORM:** Drizzle ORM (latest) with `drizzle-kit` for migrations
TypeScript-first, schema-as-code, migration tracking. Critical for a solo founder managing schema evolution across app versions on user devices.

**Schema (core tables):**
- `contacts` — id, name, phone, photo_uri, created_at, updated_at
- `memos` — id, contact_id, audio_path, raw_transcript, status (pending/extracted/failed), created_at
- `context_points` — id, memo_id, content, created_at
- `follow_ups` — id, contact_id, memo_id, due_date, status (pending/completed/snoozed), context_snapshot
- `consent_state` — stt_consent_granted, consent_version, updated_at
- `stt_queue` — id, memo_id, audio_path, attempts, status, created_at

**Migration strategy:** Drizzle Kit generates versioned migration files; applied at app startup before any DB access. Migrations are append-only and forward-only — no rollbacks on user devices.

**Encryption key management:** SQLCipher key derived and stored in expo-secure-store. Key generated on first launch, never leaves the device.

---

### AI Extraction

**Provider:** Anthropic Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
Structured JSON extraction from ~200-word transcript. Target: <3s response time.
Prompt instructs extraction of: `{name, context_points[], follow_up_date, follow_up_intent}`.
Missing fields returned as null — triggers the one-field-at-a-time confirmation flow (FR13).

**API key handling:** Shipped in app bundle for MVP. Migrate to serverless proxy in Vision phase to prevent key exposure in app binary.

**Fallback:** If Claude API times out or errors, store raw transcript and prompt user to retry — no silent failure (FR14).

---

### STT Accuracy Validation (Pre-Development Spike)

**Requirement:** PRD technical success criterion — ≥90% word accuracy across Hindi, Gujarati, and code-switched speech on Sarvam AI primary; combined primary + fallback ≥95%.

**Spike protocol (must complete before any feature story begins):**

1. **Test corpus:** Record 30 real voice memos — 10 Hindi, 10 Gujarati, 10 code-switched (Hindi-English) — covering typical CRM utterances (names, dates, relationship context). Use actual target-user speech patterns, not clean studio recordings.
2. **Baseline measurement:** Submit corpus to Sarvam AI; calculate Word Error Rate (WER) per language and overall.
3. **Fallback measurement:** Route same corpus through ElevenLabs STT; compare WER.
4. **Failure threshold:** If combined accuracy <95%, open a Sarvam AI support ticket before sprint 1 begins — do not proceed assuming the gap will close.
5. **Language code verification:** Confirm Sarvam AI `language_code` values for Hindi (`hi-IN`), Gujarati (`gu-IN`), and code-switched mode — document in `constants/languages.ts`.
6. **Spike output:** A markdown note in `docs/spikes/stt-accuracy.md` with raw WER per language, pass/fail against threshold, and any prompt or preprocessing changes needed.

**Owner:** Solo founder. **Timebox:** 2 days max.

---

### Offline Queue

**Strategy:** SQLite-persisted queue via `stt_queue` table.
Audio file path + memo_id persisted at tap-stop. Queue processor runs on app foreground with connectivity. OEM process-kill safe — queue survives restart.

**Queue states:** `pending → processing → completed | failed`
Failed entries after 3 attempts: status set to `failed`, user prompted to retry manually.

---

### Frontend Architecture

**State management:** Zustand (latest)
Global stores for: `appState` (user prefs, language, consent flags), `captureFlow` (in-progress memo state), `subscriptionState` (plan tier, contact count).
Local component state for UI-only concerns. Drizzle queries feed component state directly — no separate data-fetching layer needed for a local DB.

**Navigation:** Expo Router (file-based). Tab structure:
- `app/(tabs)/capture.tsx` — capture screen + capture flow modal stack
- `app/(tabs)/contacts.tsx` — contact list + contact detail
- `app/(tabs)/settings.tsx` — preferences, consent, subscription, backup

**UI components:** React Native Paper (MD3) as base; custom components for record button, processing animation, paywall (per UX spec).

---

### Internationalisation (i18n)

**Library:** `react-i18next` + `i18next` (latest)
Standard React Native i18n stack. Supports runtime locale switching without app restart — required for language selection in onboarding to gate all subsequent copy, notification strings, and extraction prompts.

**Language scope:** Hindi (`hi`), Gujarati (`gu`), English (`en`). Language selected during onboarding, stored in `app.store.ts` (`language` field), and passed as the `language_code` parameter to every Sarvam AI STT call.

**Translation file structure:**
```
constants/
  i18n/
    index.ts          # i18next init + language detection + fallback to 'hi'
    locales/
      en.json
      hi.json
      gu.json
```

**Key naming:** Dot-notation namespaced by screen — `capture.recordButton`, `notifications.morning`, `extraction.namePrompt`. All notification copy moves here; `constants/notifications.ts` re-exports i18n keys, not raw strings. Language-specific Claude Haiku prompt templates in `constants/extraction.ts` are keyed by `LanguageCode`.

**Initialization:** `i18next` initialised in `app/_layout.tsx` before DB migrations run — language must be available before the first render.

---

### Google Drive Backup

**OAuth library:** `expo-auth-session` with Google OAuth provider
Ships with Expo managed workflow — no extra native module. Handles the OAuth 2.0 PKCE flow for Drive App Data scope.

**Scopes:** `https://www.googleapis.com/auth/drive.appdata` only — no access to personal Drive files. Token stored in `expo-secure-store` under key `google_drive_token`.

**Flow:** Settings → `BackupSettings.tsx` → `expo-auth-session` PKCE → token stored → `backup.service.ts` uses token for Drive API calls. Token refresh handled by `expo-auth-session` automatically.

**Data written:** Single encrypted SQLite export file in Drive App Data folder — not visible to or accessible by user or other apps.

---

### Infrastructure & Deployment

**CI/CD:** EAS Build + GitHub Actions
- `eas build --profile preview` for internal testing builds
- `eas build --profile production` triggered on version tags
- OEM notification testing (Xiaomi/Realme) on physical devices only — not simulator

**Error tracking:** Sentry (`@sentry/react-native`, latest)
Crash reporting + performance monitoring. Source maps uploaded via EAS post-build hook.

**Product analytics:** PostHog (`posthog-react-native`, latest)
Privacy-first. Track: capture completions, STT success/failure rate, extraction confirmation rate, paywall conversion. No PII in event properties.

**Environment config:** `app.config.ts` with EAS secrets for API keys (Claude, Sarvam, ElevenLabs STT, PostHog). `.env.local` for local dev.

**Linting + formatting:** `eslint-config-expo` + `prettier` (dev deps). ESLint extends `expo` config — TypeScript-aware, React Native rules included. Prettier with default config. Both enforced in CI via `eslint . --max-warnings 0` before EAS build.

**Startup / cold start masking:** `expo-splash-screen` keeps the native splash visible during DB open + migration check in `app/_layout.tsx`. Call `SplashScreen.preventAutoHideAsync()` at module level; call `SplashScreen.hideAsync()` only after `db/index.ts` resolves. This decouples "app is interactive" from "migrations complete" without a React loading screen — preserves cold start <3s NFR on low-end Android. If a schema migration is detected (i.e., the migration list has new entries), run it synchronously behind the splash; otherwise open DB and proceed immediately.

## Implementation Patterns & Consistency Rules

### Naming Conventions

**Database (Drizzle schema):** snake_case everywhere
- Tables: `contacts`, `memos`, `context_points`, `follow_ups`, `stt_queue`, `consent_state`
- Columns: `contact_id`, `created_at`, `follow_up_date`, `raw_transcript`
- No Hungarian notation, no `tbl_` prefixes

**TypeScript/React:**
- Components: PascalCase (`RecordButton`, `ExtractionReviewCard`)
- Component files: PascalCase (`RecordButton.tsx`)
- Screen files: kebab-case per Expo Router convention (`capture.tsx`, `contact-detail.tsx`)
- Functions + variables: camelCase (`handleRecordStop`, `contactCount`)
- Zustand stores: `use[Domain]Store` (`useAppStore`, `useCaptureStore`, `useSubscriptionStore`)
- Service files: `[domain].service.ts` (`stt.service.ts`, `extraction.service.ts`)

**IDs:** `nanoid()` (not UUID) — shorter, URL-safe, no native crypto dependency

---

### Project Structure

```
app/                        # Expo Router screens only — no logic here
  (tabs)/
    capture.tsx
    contacts.tsx
    settings.tsx
  contact/[id].tsx
components/
  capture/                  # Capture-flow components
  contacts/                 # Contact list + detail components
  shared/                   # Cross-feature components (EmptyState, etc.)
services/                   # All external integrations — pure functions
  stt.service.ts            # Sarvam AI + ElevenLabs STT + queue
  extraction.service.ts     # Claude Haiku API call + prompt
  backup.service.ts         # Google Drive OAuth + sync
  payments.service.ts       # IAP + subscription state
  notifications.service.ts  # Schedule/cancel nudges + follow-up reminders
db/
  schema.ts                 # Single Drizzle schema file — all tables
  migrations/               # Generated by drizzle-kit
  queries/
    contacts.ts
    memos.ts
    follow-ups.ts
    queue.ts
stores/                     # Zustand stores
  app.store.ts
  capture.store.ts
  subscription.store.ts
hooks/                      # Custom React hooks only
__tests__/                  # Co-located *.test.ts next to source files
```

---

### Service Return Pattern

All async service functions return `{ data, error }` — never throw:

```ts
// CORRECT
async function transcribeAudio(path: string): Promise<{ data: string | null; error: Error | null }>

// WRONG — never throw from a service
async function transcribeAudio(path: string): Promise<string> // throws on failure
```

---

### State Ownership Rules

- **Drizzle (SQLite)** = source of truth for all persisted data
- **Zustand** = ephemeral UI state only (in-progress capture flow, loading flags, plan tier cache)
- **No duplication:** never mirror DB data into a Zustand store — query Drizzle directly in components/hooks
- **No derived state in stores** — compute in component or selector

---

### Critical Invariants (agents must never violate)

1. **Audio-first:** `expo-av` writes audio to disk at tap-stop → THEN update `stt_queue` → THEN navigate. No exceptions.
2. **Consent gate:** Check `consent_state.stt_consent_granted === true` before every STT call. Gate is enforced in `stt.service.ts`, not in UI.
3. **Contact count check:** Freemium gate checked at contact-link step, not at capture start. Audio + extraction always complete first.
4. **No silent drops:** STT failure → raw transcript saved + user prompted. Extraction failure → raw transcript saved + user prompted.
5. **Migration-first:** DB opened and all migrations applied before any component renders. Enforce in app `_layout.tsx` root.

---

### Error Handling

- **Services:** return `{ data: null, error: Error }` — caller decides how to surface
- **UI:** show inline error state on the relevant screen — no global error toast for user-recoverable errors
- **Crashes:** Sentry captures automatically — no manual try/catch for crash reporting
- **STT/extraction errors:** always give user a retry path — never a dead end

---

### Loading State Naming

```ts
isLoading      // data fetch in progress
isProcessing   // STT or extraction in progress
isSubmitting   // user-initiated write (save contact, schedule follow-up)
isInitialising // app startup DB open + migrations only
```

Boolean flags only — no `status: 'idle' | 'loading' | 'success' | 'error'` strings unless the extra states are genuinely needed.

---

### Date/Time

- **SQLite storage:** Unix timestamp integers (`created_at INTEGER`)
- **TypeScript layer:** `Date` objects or ISO strings — convert at the DB boundary in Drizzle queries
- **Display:** `Intl.DateTimeFormat` with user locale — never hardcode date format strings

## Project Structure & Boundaries

### Complete Project Directory Structure

```
gods-plan/
├── app.config.ts               # Expo config with EAS secrets
├── eas.json                    # EAS Build profiles (dev/preview/production)
├── drizzle.config.ts           # Drizzle Kit config
├── tsconfig.json               # TypeScript strict mode
├── package.json
├── .env.local                  # Local dev API keys (gitignored)
├── .env.example
├── .gitignore
├── .github/
│   └── workflows/
│       └── build.yml           # EAS Build on version tag push
│
├── app/                        # Expo Router screens — no business logic
│   ├── _layout.tsx             # Root layout: DB init + migrations before render
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab bar: capture · contacts · settings
│   │   ├── capture.tsx
│   │   ├── contacts.tsx
│   │   └── settings.tsx
│   ├── contact/
│   │   └── [id].tsx            # Contact detail + memo history
│   └── onboarding/
│       ├── _layout.tsx
│       ├── language.tsx        # Language selection (gates all copy)
│       ├── welcome.tsx         # Single hero screen
│       ├── battery.tsx         # Android battery optimisation prompt
│       └── first-capture.tsx   # Scripted first real capture loop
│
├── components/
│   ├── capture/
│   │   ├── RecordButton.tsx          # Custom: circle, haptics, waveform
│   │   ├── WaveformAnimation.tsx     # Teal waveform — recording indicator
│   │   ├── ProcessingScreen.tsx      # "processing your memo" static animation
│   │   ├── ExtractionReviewCard.tsx  # "here's what i got"
│   │   ├── MissingFieldPrompt.tsx    # One-field-at-a-time correction
│   │   ├── ContactLinkingScreen.tsx  # "is this [Name]?"
│   │   └── CaptureComplete.tsx       # "[Name] saved. follow-up on [date]."
│   ├── contacts/
│   │   ├── ContactList.tsx
│   │   ├── ContactListItem.tsx       # Name, last interaction, next follow-up
│   │   ├── ContactDetail.tsx
│   │   ├── MemoHistoryList.tsx
│   │   └── FollowUpItem.tsx          # Pending/completed follow-up row
│   ├── settings/
│   │   ├── ConsentSettings.tsx       # STT consent + data deletion
│   │   ├── BackupSettings.tsx        # Google Drive toggle + OAuth
│   │   ├── NotificationSettings.tsx  # Nudge timing windows
│   │   └── SubscriptionStatus.tsx    # Plan + manage subscription
│   └── shared/
│       ├── Paywall.tsx               # Custom: anchor pricing, trial framing
│       ├── EmptyState.tsx
│       └── ErrorState.tsx            # Inline retry UI
│
├── services/                   # Pure functions — all external integrations
│   ├── stt.service.ts          # Sarvam AI → ElevenLabs STT fallback + queue processor
│   ├── extraction.service.ts   # Claude Haiku API + prompt + response parsing
│   ├── notifications.service.ts # Schedule/cancel nudges + follow-up reminders
│   ├── backup.service.ts       # Google Drive App Data OAuth + sync
│   ├── payments.service.ts     # Google Play Billing / Apple IAP
│   └── consent.service.ts      # Read/write consent_state, version checks
│
├── db/
│   ├── index.ts                # Open SQLCipher DB, load key from expo-secure-store
│   ├── schema.ts               # All Drizzle table definitions (single source of truth)
│   ├── migrations/             # Generated by drizzle-kit — never hand-edit
│   └── queries/
│       ├── contacts.ts
│       ├── memos.ts
│       ├── context-points.ts
│       ├── follow-ups.ts
│       ├── queue.ts
│       └── consent.ts
│
├── stores/
│   ├── app.store.ts            # language, stt_consent_granted, onboarding_complete
│   ├── capture.store.ts        # in-progress audio_path, transcript, extracted fields
│   └── subscription.store.ts   # plan_tier, contact_count
│
├── hooks/
│   ├── useContacts.ts          # Drizzle query + real-time updates
│   ├── useCaptureFlow.ts       # Orchestrates record → STT → extract → save
│   ├── useFollowUps.ts
│   └── useSubscription.ts      # Contact count enforcement
│
├── constants/
│   ├── languages.ts            # Supported languages + Sarvam AI language codes
│   ├── notifications.ts        # Re-exports i18n keys for nudge copy (not raw strings)
│   ├── extraction.ts           # Claude Haiku prompt templates keyed by LanguageCode
│   └── i18n/
│       ├── index.ts            # i18next init + language detection (fallback: 'hi')
│       └── locales/
│           ├── en.json
│           ├── hi.json
│           └── gu.json
│
├── docs/
│   └── spikes/
│       └── stt-accuracy.md     # STT accuracy spike output (WER per language, pass/fail)
│
└── types/
    ├── db.types.ts             # Inferred from Drizzle schema (InferSelectModel)
    └── api.types.ts            # STT + extraction API response shapes
```

### Requirements → Structure Mapping

| FR Category | Primary Location |
|---|---|
| Capture & Recording (FR1–7) | `components/capture/`, `stores/capture.store.ts`, `db/queries/queue.ts` |
| STT & AI Extraction (FR8–15) | `services/stt.service.ts`, `services/extraction.service.ts` |
| Contact Management (FR16–25) | `components/contacts/`, `db/queries/contacts.ts`, `db/queries/context-points.ts` |
| Follow-up & Scheduling (FR26–31) | `services/notifications.service.ts`, `db/queries/follow-ups.ts` |
| Notifications & Nudges (FR32–35) | `services/notifications.service.ts`, `constants/notifications.ts` |
| Onboarding (FR36–40) | `app/onboarding/` |
| Privacy/Consent/Compliance (FR41–47) | `services/consent.service.ts`, `db/queries/consent.ts`, `services/backup.service.ts` |
| Subscription & Payments (FR48–53) | `services/payments.service.ts`, `stores/subscription.store.ts`, `components/shared/Paywall.tsx` |

### Integration Boundaries

| Boundary | Direction | Location |
|---|---|---|
| Sarvam AI STT | Outbound HTTPS | `services/stt.service.ts` |
| ElevenLabs STT (fallback) | Outbound HTTPS | `services/stt.service.ts` |
| Claude Haiku 4.5 (extraction) | Outbound HTTPS | `services/extraction.service.ts` |
| Google Drive App Data (OAuth PKCE) | Outbound HTTPS via `expo-auth-session` | `services/backup.service.ts` |
| Google Play Billing / Apple IAP | Native SDK | `services/payments.service.ts` |
| expo-notifications | Local + FCM/APNS | `services/notifications.service.ts` |
| expo-contacts (device) | Local read | `db/queries/contacts.ts` (link step only) |

### Core Data Flow

```
Notification tap / manual open
  → app/(tabs)/capture.tsx
  → useCaptureFlow hook
    1. expo-av records → FileSystem.writeAsync (audio to disk FIRST)
    2. db/queries/queue.ts — insert stt_queue row (status: pending)
    3. stt.service — Sarvam AI → transcript (or queue if offline)
    4. extraction.service — Claude Haiku → { name, context_points[], follow_up_date }
    5. ExtractionReviewCard / MissingFieldPrompt — user confirms
    6. subscription.store — check contact_count (freemium gate here)
    7. ContactLinkingScreen — link or create contact
    8. db/queries — write contacts, memos, context_points, follow_ups
    9. notifications.service — schedule follow-up reminder
    10. CaptureComplete — auto-advance home after 2s
```

---

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Check Critical Invariants (Implementation Patterns section) before implementing any capture-flow story
- Never bypass the consent gate in `stt.service.ts` — enforce at service layer only
- First action on any new session: read this document before touching code

**First Implementation Priority:**
```bash
# 1. Init project
npx create-expo-app@latest gods-plan

# 2. Install all deps (full list)
npx expo install expo-notifications expo-contacts expo-calendar expo-av \
  expo-haptics expo-secure-store expo-camera expo-auth-session expo-splash-screen
npm install @op-engineering/op-sqlite drizzle-orm drizzle-kit zustand nanoid \
  react-native-paper @sentry/react-native posthog-react-native \
  react-i18next i18next
npm install --save-dev eslint-config-expo prettier

# 3. Configure TypeScript strict mode, ESLint (eslint-config-expo), Prettier, EAS profiles
# 4. Write constants/i18n/index.ts + locales/en.json, hi.json, gu.json
# 5. Write db/schema.ts + run first drizzle-kit migration
# 6. Run STT accuracy spike (docs/spikes/stt-accuracy.md) before any feature story
```
