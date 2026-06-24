# Story 1.6: Observability Setup (Sentry + PostHog)

Status: done

## Story

As a developer,
I want Sentry crash reporting and PostHog analytics initialized,
So that errors are captured in production and product usage is measurable from first launch.

## Acceptance Criteria

1. **Given** Story 1.1 is complete and Sentry + PostHog projects are created **When** the app initializes **Then** Sentry is initialized with the DSN from EAS secrets and captures unhandled JS errors and native crashes
2. **And** source maps are uploaded to Sentry as part of the EAS production build via a post-build hook (via the `@sentry/react-native` Expo plugin)
3. **And** PostHog is initialized with the project API key from EAS secrets
4. **And** a `capture_complete` event is defined in the PostHog event schema (to be fired in Epic 2)
5. **And** no user PII (names, transcripts, contact data) appears in any Sentry error payload or PostHog event property
6. **And** both integrations are disabled in the dev EAS profile (`APP_ENV === 'development'`)

## Tasks / Subtasks

- [x] Task 1: Add Sentry DSN + auth token env vars and update app.config.ts (AC: 1, 2)
  - [x] Add `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to `.env.example`
  - [x] Add `sentryDsn: process.env.SENTRY_DSN ?? ''` to `app.config.ts` extra block
  - [x] Add `appEnv: process.env.APP_ENV ?? 'development'` to `app.config.ts` extra block
  - [x] Add `@sentry/react-native/expo` plugin with org and project slug to `app.config.ts` plugins
  - [x] Add `SENTRY_AUTH_TOKEN` to production and preview `eas.json` env blocks (referenced as placeholder — actual value set via `eas secret:create`)
- [x] Task 2: Initialize Sentry in app/_layout.tsx (AC: 1, 5, 6)
  - [x] Call `Sentry.init()` at module level in `app/_layout.tsx` with DSN from `Constants.expoConfig.extra.sentryDsn`
  - [x] Set `enabled: false` when `appEnv === 'development'`
  - [x] Add `beforeSend` hook that strips any breadcrumb data containing PII patterns (contact names, transcripts)
  - [x] Wrap the default export with `Sentry.wrap()` for automatic performance tracing
- [x] Task 3: Create analytics service with PostHog event schema (AC: 3, 4, 5)
  - [x] Create `src/services/analytics.service.ts`
  - [x] Initialize PostHog singleton with API key from `Constants.expoConfig.extra.posthogApiKey`
  - [x] Export `ANALYTICS_EVENTS` constant object with `CAPTURE_COMPLETE: 'capture_complete'`
  - [x] Export a `track(event, properties)` helper that validates no PII keys are present before calling PostHog
  - [x] Export `analyticsClient` instance for use in PostHogProvider
- [x] Task 4: Integrate PostHog provider in app/_layout.tsx (AC: 3, 6)
  - [x] Import `PostHogProvider` from `posthog-react-native`
  - [x] Wrap the `ThemeProvider` tree with `PostHogProvider` using the `analyticsClient`
  - [x] PostHog is disabled in dev via `disabled` flag on the client
- [x] Task 5: Validate (AC: all)
  - [x] Run `npx tsc --noEmit` — zero errors
  - [x] Run `npm run lint` — zero warnings

## Dev Notes

### Architecture Requirements

- **Error tracking**: `@sentry/react-native` v8 — Sentry.init() at module level, before any React render
- **Analytics**: `posthog-react-native` — PostHogProvider wraps the app tree
- **No PII rule**: Sentry `beforeSend` strips PII; PostHog track helper validates no PII keys
- **Dev disabled**: Both disabled when `appEnv === 'development'` (from `app.config.ts` extra block)
- **Source maps**: `@sentry/react-native/expo` plugin auto-configures EAS post-build hook using `SENTRY_AUTH_TOKEN`
- [Source: architecture.md lines 279-283]

### Key Implementation Details

**Sentry plugin configuration** (in `app.config.ts` plugins array):
```typescript
[
  '@sentry/react-native/expo',
  {
    organization: 'thakkarhet',
    project: 'gods-plan-react-native',
  },
]
```
The plugin adds a post-build hook that reads `SENTRY_AUTH_TOKEN` at build time and uploads source maps. No manual `eas.json` postBuild config needed.

**Sentry init pattern** (module level in `_layout.tsx`):
```typescript
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
Sentry.init({
  dsn: extra?.sentryDsn ?? '',
  enabled: extra?.appEnv !== 'development' && Boolean(extra?.sentryDsn),
  beforeSend(event) {
    // Strip breadcrumb messages to prevent accidental PII leakage
    if (event.breadcrumbs?.values) {
      event.breadcrumbs.values = event.breadcrumbs.values.map((b) => ({
        ...b,
        message: '[redacted]',
        data: undefined,
      }));
    }
    return event;
  },
});
```

**PostHog service** (`src/services/analytics.service.ts`):
```typescript
import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
const isDev = extra?.appEnv === 'development';

export const analyticsClient = new PostHog(extra?.posthogApiKey ?? 'placeholder', {
  host: 'https://us.i.posthog.com',
  disabled: isDev || !extra?.posthogApiKey,
});

export const ANALYTICS_EVENTS = {
  CAPTURE_COMPLETE: 'capture_complete',
} as const;

const PII_KEYS = ['name', 'transcript', 'contact', 'phone', 'email', 'address'];

export function track(event: string, properties?: Record<string, unknown>): void {
  if (properties) {
    const hasPii = Object.keys(properties).some((k) =>
      PII_KEYS.some((pii) => k.toLowerCase().includes(pii))
    );
    if (hasPii) {
      if (__DEV__) console.warn('[Analytics] Blocked PII in event properties:', event);
      return;
    }
  }
  analyticsClient.capture(event, properties);
}
```

### Files Being Modified

**`app.config.ts`**: Add `sentryDsn` and `appEnv` to extra block; add Sentry Expo plugin.

**`app/_layout.tsx`**: Add Sentry.init() at module level; wrap export with Sentry.wrap(); add PostHogProvider.

**`.env.example`**: Add `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` entries.

### New Files

- `src/services/analytics.service.ts` — PostHog singleton + event schema + PII-safe track helper

### Previous Story Learnings

- File paths always use `src/` prefix (architecture doc omits it)
- Import alias `@/` maps to `./src/`
- `npx tsc --noEmit` + `npm run lint` are the two validation commands
- No test runner — validation is compile + lint only
- `dangerouslyDisableSandbox: true` on all Bash tool calls

### References

- [Source: epics/epic-1-project-foundation.md — Story 1.6 ACs]
- [Source: architecture.md lines 279-283 — Sentry + PostHog]
- [Source: architecture.md line 386 — Sentry crash capture]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `app.config.ts` (modified): Added `sentryDsn` and `appEnv` to extra block; added `@sentry/react-native/expo` plugin with org `thakkarhet` and project `gods-plan-react-native`. Plugin auto-configures EAS post-build hook for source map upload using `SENTRY_AUTH_TOKEN`.
- `src/app/_layout.tsx` (modified): Added `Sentry.init()` at module level with DSN from `Constants.expoConfig.extra.sentryDsn`; `enabled: false` in dev; `beforeSend` strips all breadcrumb messages to prevent PII leakage. `PostHogProvider` wraps the app tree. Default export wrapped with `Sentry.wrap()` for automatic performance tracing.
- `src/services/analytics.service.ts` (new): PostHog singleton initialized with `posthogApiKey` from EAS secrets, `disabled: true` in dev. `ANALYTICS_EVENTS.CAPTURE_COMPLETE = 'capture_complete'` is the Epic 2 event. `track()` helper blocks any call whose property keys contain PII patterns (name, transcript, contact, phone, email, address).
- `.env.example` (modified): Added `SENTRY_DSN` and `SENTRY_AUTH_TOKEN` entries with setup instructions.
- `npx tsc --noEmit` — zero errors. `npm run lint` — zero warnings.

### File List

- `gods-plan/app.config.ts` (modified — sentryDsn, appEnv in extra; @sentry/react-native/expo plugin)
- `gods-plan/src/app/_layout.tsx` (modified — Sentry.init, PostHogProvider, Sentry.wrap export)
- `gods-plan/src/services/analytics.service.ts` (new — PostHog singleton, ANALYTICS_EVENTS, track helper)
- `gods-plan/.env.example` (modified — SENTRY_DSN and SENTRY_AUTH_TOKEN entries)

### Change Log

- Story 1.6 implemented: Sentry crash reporting initialized with PII-safe beforeSend; PostHog analytics initialized with PII guard in track(); capture_complete event schema defined; both disabled in dev (APP_ENV=development); source map upload configured via @sentry/react-native/expo plugin (2026-06-06)
