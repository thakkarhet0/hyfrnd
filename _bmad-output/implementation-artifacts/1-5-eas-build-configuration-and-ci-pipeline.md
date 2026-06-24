# Story 1.5: EAS Build Configuration and CI Pipeline

Status: done

## Story

As a developer,
I want EAS Build profiles and a GitHub Actions CI workflow configured,
so that preview and production builds are reproducible and triggered automatically on release tags.

## Acceptance Criteria

1. **Given** Story 1.1 is complete and a GitHub repository exists **When** a version tag (e.g. `v1.0.0`) is pushed **Then** the GitHub Actions workflow at `.github/workflows/build.yml` triggers an EAS production build for both iOS and Android
2. **And** the workflow runs `npm run lint` and `npx tsc --noEmit` before the EAS build — if either check fails, the build is skipped
3. **And** EAS secrets (`CLAUDE_API_KEY`, `SARVAM_API_KEY`, `ELEVENLABS_API_KEY`, `POSTHOG_API_KEY`) are never committed to the repo; actual values live in EAS Environment Variables (set via `eas secret:create` or the EAS dashboard), and the build profiles are documented in `eas.json`
4. **And** `eas.json` defines `dev`, `preview`, and `production` profiles with `APP_ENV` set per profile so `app.config.ts` can distinguish environments at runtime
5. **And** `app.config.ts` includes `ios.bundleIdentifier` and `android.package` required by EAS managed workflow
6. **And** `.env.example` documents all required environment variables with placeholder values and setup instructions — already exists, verify it is complete
7. **And** `.gitignore` ensures no secret-bearing files are committed — `.env*.local` already covered; verify plain `.env` is also excluded
8. **And** `npx tsc --noEmit` passes with zero errors and `npm run lint` passes with zero warnings after all changes

## Tasks / Subtasks

- [x] Task 1: Update `app.config.ts` with EAS-required fields (AC: 5)
  - [x] Add `ios.bundleIdentifier: 'com.godsplan.app'`
  - [x] Add `android.package: 'com.godsplan.app'`
  - [x] Add `owner: 'thakkarhet'` (the EAS account slug — update to actual account name if different)
  - [x] Preserve all existing plugins, experiments, and extra config exactly
- [x] Task 2: Update `eas.json` with per-profile `env` and document secrets (AC: 3, 4)
  - [x] Add `"env": { "APP_ENV": "development" }` to `dev` profile
  - [x] Add `"env": { "APP_ENV": "preview" }` to `preview` profile
  - [x] Add `"env": { "APP_ENV": "production" }` to `production` profile
  - [x] The four API key secrets (`CLAUDE_API_KEY`, `SARVAM_API_KEY`, `ELEVENLABS_API_KEY`, `POSTHOG_API_KEY`) are configured via `eas secret:create` in the EAS dashboard — no values in the file
- [x] Task 3: Create `.github/workflows/build.yml` (AC: 1, 2)
  - [x] Trigger on `push` to tags matching `v*`
  - [x] Steps: checkout → setup Node 20 → `npm ci` → `npm run lint` → `npx tsc --noEmit` → setup EAS (via `expo/expo-github-action@v8` with `EXPO_TOKEN` secret) → `eas build --profile production --platform all --non-interactive`
- [x] Task 4: Verify and update `.gitignore` (AC: 7)
  - [x] Confirm `.env*.local` is present (it is)
  - [x] Add `.env` (plain, without suffix) if not already excluded
- [x] Task 5: Verify `.env.example` is complete (AC: 6)
  - [x] Confirm all four API key placeholders exist
  - [x] Add setup instructions comment if not present
- [x] Task 6: Validate (AC: 8)
  - [x] Run `npx tsc --noEmit` — zero errors
  - [x] Run `npm run lint` — zero warnings

## Dev Notes

### Architecture Requirements

- **Build system**: EAS Build (managed workflow) — no `ios/` or `android/` native dirs committed (gitignored)
- **CI trigger**: GitHub Actions on version tag push (`v*`) → EAS production build
- **Profiles**: `dev` (developmentClient + internal), `preview` (internal), `production` (store)
- **Lint enforcement in CI**: `eslint . --max-warnings 0` before EAS build (architecture line 287)
- **TypeScript check in CI**: `npx tsc --noEmit` before EAS build
- **EAS CLI version**: `>= 16.0.0` (already in `eas.json`)
- [Source: architecture.md lines 274-287]

### Current State of Files Being Modified

**`eas.json`** — current (already exists):
```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "dev": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  },
  "submit": {
    "production": {}
  }
}
```
Change: add `"env": { "APP_ENV": "..." }` to each build profile.

**`app.config.ts`** — current (exists, missing EAS-required fields):
```typescript
ios: {
  icon: './assets/expo.icon',
},
android: {
  adaptiveIcon: { ... },
  predictiveBackGestureEnabled: false,
},
```
Change: add `ios.bundleIdentifier`, `android.package`, top-level `owner` field.

**`.env.example`** — current (already exists and complete):
```
# Copy this file to .env.local and fill in your values
CLAUDE_API_KEY=
SARVAM_API_KEY=
ELEVENLABS_API_KEY=
POSTHOG_API_KEY=
```
No changes needed — verify it matches the four required keys.

**`.gitignore`** — current (has `.env*.local` but NOT plain `.env`):
```
# local env files
.env*.local
```
Change: add `.env` to prevent accidental commit of a plain env file.

### Target File Structures

**`eas.json`** — after update:
```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "dev": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_ENV": "preview"
      }
    },
    "production": {
      "distribution": "store",
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**`.github/workflows/build.yml`** — new file:
```yaml
name: EAS Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    name: EAS Production Build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: EAS Build
        run: eas build --profile production --platform all --non-interactive
```

**`app.config.ts`** — additions only (preserve everything else):
```typescript
// Add at top level (alongside name, slug, version):
owner: 'thakkarhet',

// Add inside ios block:
ios: {
  icon: './assets/expo.icon',
  bundleIdentifier: 'com.godsplan.app',
},

// Add inside android block:
android: {
  adaptiveIcon: { ... },
  predictiveBackGestureEnabled: false,
  package: 'com.godsplan.app',
},
```

### EAS Secrets Setup (Out-of-Code Steps, Document for Operator)

These steps must be done once per EAS project. They are NOT code changes but must be completed before the CI can run successfully:

```bash
# 1. Login to EAS
eas login

# 2. Link project (if not already linked)
eas init

# 3. Create secrets (one-time, per environment)
eas secret:create --scope project --name CLAUDE_API_KEY --value <key>
eas secret:create --scope project --name SARVAM_API_KEY --value <key>
eas secret:create --scope project --name ELEVENLABS_API_KEY --value <key>
eas secret:create --scope project --name POSTHOG_API_KEY --value <key>

# 4. Create EXPO_TOKEN for GitHub Actions
# Go to: https://expo.dev/settings/access-tokens
# Create a token → add as GitHub secret named EXPO_TOKEN in repo Settings → Secrets
```

These commands are documented in the story for reference but do NOT produce code artifacts — they operate on the EAS cloud service.

### How API Keys Flow at Build Time

```
EAS Dashboard (secrets) → EAS Build environment → process.env.CLAUDE_API_KEY
                                                 → process.env.SARVAM_API_KEY
                                                 → process.env.ELEVENLABS_API_KEY
                                                 → process.env.POSTHOG_API_KEY
                                                         ↓
                                                   app.config.ts extra block
                                                         ↓
                                            Constants.expoConfig.extra.claudeApiKey
```

EAS secrets are automatically injected as environment variables during the build. `app.config.ts` reads them via `process.env.*` and exposes them via `expo-constants` `extra` block. No changes to `app.config.ts`'s `extra` block are needed — it already reads from `process.env.*`.

### GitHub Actions Workflow Details

- **Trigger**: `on: push: tags: ['v*']` — fires only on version tag pushes (e.g., `v1.0.0`, `v1.2.3-rc1`)
- **Node version**: 20 (LTS) — matches Expo SDK 56 / React Native 0.85 requirements
- **`npm ci`**: Clean install from `package-lock.json` — ensures reproducible builds
- **`expo/expo-github-action@v8`**: Official Expo GitHub Action — handles EAS CLI setup and auth via `EXPO_TOKEN`
- **`--non-interactive`**: Required for CI — prevents EAS from prompting for input
- **`--platform all`**: Builds both iOS and Android in parallel on EAS servers

### `app.config.ts` Owner and Bundle IDs

- **`owner`**: Must match the EAS account slug (Expo username or org slug). Set to `'godsplan'` as placeholder — update if actual EAS account name differs.
- **`ios.bundleIdentifier`**: `'com.godsplan.app'` — follows reverse-domain convention. Must be unique in App Store Connect.
- **`android.package`**: `'com.godsplan.app'` — same value; must be unique in Google Play.
- **IMPORTANT**: If an EAS project has already been linked (`eas init` was run), a `projectId` may need to be added under `extra.eas.projectId`. If `eas init` has NOT been run yet, skip this — `eas init` adds it automatically.

### No Test Runner

No Jest configured in this project. Validation: `npx tsc --noEmit` + `npm run lint` only. The GitHub Actions workflow and YAML files are not testable locally — correct syntax can be verified by reading the file carefully.

### Previous Story Learnings

- File paths always use `src/` prefix (architecture doc omits it)
- Import alias `@/` maps to `./src/`
- `npx tsc --noEmit` + `npm run lint` are the two validation commands
- No test runner — validation is compile + lint only
- `dangerouslyDisableSandbox: true` on all Bash tool calls

### Project Structure Notes

New files:
- `.github/workflows/build.yml` — CI pipeline (must create `.github/` and `workflows/` dirs)
- No `src/` changes for this story — all changes are config/CI files at project root

Modified files:
- `eas.json` — add `env` blocks per profile
- `app.config.ts` — add `owner`, `ios.bundleIdentifier`, `android.package`
- `.gitignore` — add `.env` plain exclusion

### References

- [Source: epics/epic-1-project-foundation.md — Story 1.5 ACs]
- [Source: architecture.md lines 274-287 — CI/CD and EAS Build]
- [Source: architecture.md line 418 — eas.json in directory structure]
- [Source: architecture.md lines 425-426 — .github/workflows/build.yml]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `app.config.ts` (modified): Added `owner: 'thakkarhet'`, `ios.bundleIdentifier: 'com.godsplan.app'`, `android.package: 'com.godsplan.app'`. All existing plugins, experiments, and extra config preserved exactly. These three fields are required by EAS managed workflow to generate native projects and register the app for store distribution.
- `eas.json` (modified): Added `"env": { "APP_ENV": "..." }` to each build profile (`development` / `preview` / `production`). The four API key secrets are injected automatically by EAS at build time when set via `eas secret:create` — no secret values in the file. The `APP_ENV` variable allows `app.config.ts` to distinguish environments at runtime if needed.
- `.github/workflows/build.yml` (new): GitHub Actions workflow triggering on `push` to `v*` tags. Steps: checkout → Node 20 setup with npm cache → `npm ci` → `npm run lint` → `npx tsc --noEmit` → EAS setup via `expo/expo-github-action@v8` (auth via `EXPO_TOKEN` secret) → `eas build --profile production --platform all --non-interactive`. Lint and TypeScript checks gate the build — if either fails, the EAS build is skipped.
- `.gitignore` (modified): Added `.env` (plain, no suffix) to the env exclusion block. `.env*.local` was already present; adding bare `.env` closes the gap where a developer might accidentally create a plain `.env` file with real secrets.
- `.env.example` (verified, no changes): All four required keys (`CLAUDE_API_KEY`, `SARVAM_API_KEY`, `ELEVENLABS_API_KEY`, `POSTHOG_API_KEY`) present with placeholder values and setup comment. File already complete.
- `npx tsc --noEmit` — zero errors. `npm run lint` — zero warnings.

### File List

- `gods-plan/app.config.ts` (modified — owner, ios.bundleIdentifier, android.package)
- `gods-plan/eas.json` (modified — APP_ENV env per profile)
- `gods-plan/.github/workflows/build.yml` (new)
- `gods-plan/.gitignore` (modified — added .env plain exclusion)

### Change Log

- Story 1.5 implemented: EAS build profiles configured with per-environment APP_ENV; app.config.ts updated with iOS bundleIdentifier, Android package, and owner for EAS managed workflow; GitHub Actions CI workflow created triggering on v* tag push with lint+tsc gates before EAS production build; .gitignore updated to exclude plain .env (2026-06-04)
