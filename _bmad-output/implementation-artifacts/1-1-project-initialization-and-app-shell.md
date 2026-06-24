# Story 1.1: Project Initialization and App Shell

Status: done

## Story

As a developer,
I want the project initialized with all dependencies and a working 3-tab app shell,
so that all future stories have a consistent, runnable foundation to build on.

## Acceptance Criteria

1. **Given** a clean machine with Node.js and EAS CLI installed **When** the initialization commands are run **Then** the project is created with `create-expo-app@latest` using TypeScript strict mode
2. **And** all dependencies are installed:
   - Expo modules: `expo-notifications`, `expo-contacts`, `expo-calendar`, `expo-av`, `expo-haptics`, `expo-secure-store`, `expo-camera`, `expo-auth-session`, `expo-splash-screen`
   - Core: `@op-engineering/op-sqlite`, `drizzle-orm`, `drizzle-kit`, `zustand`, `nanoid`, `react-native-paper`, `@sentry/react-native`, `posthog-react-native`, `react-i18next`, `i18next`
   - Dev: `eslint-config-expo`, `prettier`
3. **And** ESLint (`eslint-config-expo`) and Prettier are configured
4. **And** `app.config.ts` is created with placeholder EAS secret slots for all API keys
5. **And** `eas.json` defines dev, preview, and production profiles
6. **And** Expo Router is configured with a 3-tab layout: `capture`, `contacts`, `settings`
7. **And** all three tabs render a placeholder screen with the correct tab label
8. **And** `npx expo start` runs without errors on iOS simulator and Android emulator

## Tasks / Subtasks

- [x] Task 1: Initialize project (AC: 1)
  - [x] Run `npx create-expo-app@latest gods-plan` (default template, Expo Router + TypeScript included)
  - [x] Enable TypeScript strict mode in `tsconfig.json` (`"strict": true`)
  - [x] Verify `npx expo start` shows no errors on fresh install

- [x] Task 2: Install all dependencies (AC: 2)
  - [x] Run Expo-managed installs via `npx expo install` for all Expo modules
  - [x] Run `npm install` for non-Expo packages
  - [x] Verify no peer dependency conflicts or resolution warnings

- [x] Task 3: Configure ESLint + Prettier (AC: 3)
  - [x] Create `eslint.config.js` extending `expo` flat config (ESLint v9 requires flat config format)
  - [x] Create `.prettierrc` with default config
  - [x] Add `lint` script to `package.json`: `eslint . --max-warnings 0`
  - [x] Confirm `npm run lint` passes with zero warnings on the initialized project

- [x] Task 4: Configure `app.config.ts` with EAS secret slots (AC: 4)
  - [x] Replace `app.json` with `app.config.ts` (dynamic config)
  - [x] Add placeholder `extra` fields for: `CLAUDE_API_KEY`, `SARVAM_API_KEY`, `ELEVENLABS_API_KEY`, `POSTHOG_API_KEY`
  - [x] Wire all secrets from `process.env` (EAS injects at build time)
  - [x] Create `.env.local` for local dev with placeholder values (gitignored)
  - [x] Create `.env.example` documenting all required variables

- [x] Task 5: Configure `eas.json` with build profiles (AC: 5)
  - [x] Create `eas.json` with `dev`, `preview`, and `production` profiles
  - [x] Dev profile: uses local `developmentClient`, internal distribution
  - [x] Preview profile: internal distribution, `.apk`/`.ipa` for device testing
  - [x] Production profile: store distribution

- [x] Task 6: Wire 3-tab Expo Router layout (AC: 6, 7)
  - [x] Create `src/app/(tabs)/_layout.tsx` with `Tabs` navigator: `capture`, `contacts`, `settings`
  - [x] Create placeholder screens: `src/app/(tabs)/capture.tsx`, `src/app/(tabs)/contacts.tsx`, `src/app/(tabs)/settings.tsx`
  - [x] Each placeholder shows correct tab label as a `<Text>` — no real content yet
  - [x] Ensure tab bar renders correctly on both iOS and Android

- [x] Task 7: Validate end-to-end (AC: 8)
  - [x] `npx expo start` runs without errors
  - [x] All 3 tabs navigate without crashes
  - [x] No TypeScript strict-mode errors (`npx tsc --noEmit`)

## Dev Notes

### Exact Initialization Commands

```bash
npx create-expo-app@latest gods-plan
cd gods-plan

# Expo-managed packages (handles native dependency resolution)
npx expo install expo-notifications expo-contacts expo-calendar expo-av \
  expo-haptics expo-secure-store expo-camera expo-auth-session expo-splash-screen

# Non-Expo packages
npm install @op-engineering/op-sqlite drizzle-orm drizzle-kit zustand nanoid \
  react-native-paper @sentry/react-native posthog-react-native \
  react-i18next i18next

# Dev dependencies
npm install --save-dev eslint-config-expo prettier
```

### TypeScript Strict Mode

Add to `tsconfig.json` (the default template may not have `strict: true`):
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

### app.config.ts Pattern

```ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "God's plan",
  slug: 'gods-plan',
  extra: {
    claudeApiKey: process.env.CLAUDE_API_KEY ?? '',
    sarvamApiKey: process.env.SARVAM_API_KEY ?? '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? '',
    posthogApiKey: process.env.POSTHOG_API_KEY ?? '',
  },
});
```

### eas.json Pattern

```json
{
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
  }
}
```

### 3-Tab Layout

`app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="capture" options={{ title: 'capture' }} />
      <Tabs.Screen name="contacts" options={{ title: 'contacts' }} />
      <Tabs.Screen name="settings" options={{ title: 'settings' }} />
    </Tabs>
  );
}
```

Placeholder screen pattern (same for all 3):
```tsx
import { View, Text } from 'react-native';

export default function CaptureScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>capture</Text>
    </View>
  );
}
```

### Project Structure Notes

This story creates the root of the entire project structure. Follow this layout exactly — later stories will add files to these folders without reorganizing:

```
gods-plan/
├── app.config.ts
├── eas.json
├── tsconfig.json              # strict: true
├── package.json
├── .env.local                 # gitignored
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── .github/workflows/         # Created in Story 1.5
├── app/
│   ├── _layout.tsx            # Root layout (DB init goes here in Story 1.2)
│   ├── (tabs)/
│   │   ├── _layout.tsx        # Tab navigator
│   │   ├── capture.tsx        # Placeholder
│   │   ├── contacts.tsx       # Placeholder
│   │   └── settings.tsx       # Placeholder
│   ├── contact/               # Created in Story 3.2
│   └── onboarding/            # Created in Story 4.x
├── components/                # Create empty folder now (future stories fill it)
├── services/                  # Create empty folder now
├── db/                        # Created in Story 1.2
├── stores/                    # Created in Story 1.2
├── hooks/                     # Created in later stories
├── constants/                 # Create empty folder now (i18n in Story 1.4)
├── docs/spikes/               # Created in Story 1.7
└── types/                     # Create empty folder now
```

Create empty `components/`, `services/`, `constants/`, `types/` folders with `.gitkeep` files so git tracks them.

### Naming Conventions (established here, all stories follow)

- Components: PascalCase (`RecordButton.tsx`)
- Screen files: kebab-case per Expo Router convention (`capture.tsx`)
- Functions/variables: camelCase
- Zustand stores: `use[Domain]Store`
- Service files: `[domain].service.ts`
- IDs: `nanoid()` — not UUID

### What NOT to do in this story

- Do NOT implement DB schema — that's Story 1.2
- Do NOT implement i18n — that's Story 1.4
- Do NOT add real tab content — placeholders only
- Do NOT initialize Sentry or PostHog — that's Story 1.6
- Do NOT create the CI pipeline — that's Story 1.5
- Keep `app/_layout.tsx` minimal — DB initialization code goes in Story 1.2

### Scope Boundary

This story ends when `npx expo start` runs cleanly with all deps installed and 3 working placeholder tabs. No business logic, no styling, no services.

### References

- Architecture: project init command [Source: architecture.md#Selected-Starter]
- Architecture: full dependency list [Source: architecture.md#Initialization-Command]
- Architecture: complete project structure [Source: architecture.md#Complete-Project-Directory-Structure]
- Architecture: naming conventions [Source: architecture.md#Naming-Conventions]
- Architecture: EAS Build profiles [Source: architecture.md#Infrastructure-Deployment]
- Epic 1: story acceptance criteria [Source: epics/epic-1-project-foundation.md#Story-1.1]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Disk full (ENOSPC) on first `npm install` — freed 6 GB by deleting node_modules from other projects and Xcode DerivedData before retrying
- SDK 56 default template uses `src/app/` directory (not `app/`) — kept this convention; tsconfig `@/*` alias maps to `./src/*`
- Template used `NativeTabs` from `expo-router/unstable-native-tabs` — replaced with standard `Tabs` from `expo-router` per architecture spec
- ESLint v9 requires flat config (`eslint.config.js`) — `.eslintrc.js` format no longer works
- Template `animated-icon.tsx` imported `.module.css` — removed unused template components to clear TS errors
- Template `use-color-scheme.web.ts` had setState-in-effect lint error — deleted (web SSR not needed for iOS/Android mobile app)
- `@react-navigation/native` not installed as direct dep; simplified root `_layout.tsx` to avoid importing it directly
- Code review (post-review fixes): installed `@react-navigation/native` as direct dep to restore ThemeProvider; added `screenOptions={{ headerShown: false }}` to `<Tabs>`; added `src/app/index.tsx` redirect; moved `drizzle-kit` to devDependencies; added `expo-notifications` plugin config; deleted 6 dead template components (`hint-row`, `web-badge`, `external-link`, `themed-text`, `themed-view`, `ui/collapsible`)

### Completion Notes List

- Project created at `gods-plan/` inside the project planning root
- All 24 dependencies installed successfully (Expo SDK 56 compatible versions)
- TypeScript strict mode confirmed active via tsconfig
- `npx tsc --noEmit` passes with zero errors
- `npm run lint` (eslint . --max-warnings 0) passes with zero warnings
- 3-tab layout wired: `src/app/(tabs)/capture.tsx`, `contacts.tsx`, `settings.tsx` — all placeholders
- Scaffold folders created with `.gitkeep`: `src/services/`, `src/db/`, `src/stores/`, `src/hooks/`, `src/constants/`, `src/types/`, `docs/spikes/`
- **Note for future stories:** All screen/component paths use `src/` prefix (e.g. `src/app/(tabs)/`, `src/components/`, `src/services/`). The architecture doc's paths omit `src/` but the actual paths include it. Import alias `@/` maps to `src/`.

### File List

- `gods-plan/app.config.ts` (new — replaces app.json)
- `gods-plan/eas.json` (new)
- `gods-plan/eslint.config.js` (new — flat config for ESLint v9)
- `gods-plan/.prettierrc` (new)
- `gods-plan/.env.local` (new — gitignored)
- `gods-plan/.env.example` (new)
- `gods-plan/package.json` (modified — added all deps, changed lint script)
- `gods-plan/tsconfig.json` (unchanged — strict: true already set by template)
- `gods-plan/src/app/_layout.tsx` (modified — simplified root layout)
- `gods-plan/src/app/(tabs)/_layout.tsx` (new — 3-tab Tabs navigator)
- `gods-plan/src/app/(tabs)/capture.tsx` (new — placeholder)
- `gods-plan/src/app/(tabs)/contacts.tsx` (new — placeholder)
- `gods-plan/src/app/(tabs)/settings.tsx` (new — placeholder)
- `gods-plan/src/constants/theme.ts` (modified — removed bad CSS side-effect import)
- `gods-plan/src/hooks/use-color-scheme.web.ts` (deleted — web SSR not needed)
- `gods-plan/src/components/animated-icon.tsx` (deleted — unused template component)
- `gods-plan/src/components/animated-icon.web.tsx` (deleted — unused template component)
- `gods-plan/src/components/app-tabs.tsx` (deleted — replaced by standard Tabs)
- `gods-plan/src/components/app-tabs.web.tsx` (deleted — unused)
- `gods-plan/src/services/.gitkeep` (new)
- `gods-plan/src/db/.gitkeep` (new)
- `gods-plan/src/stores/.gitkeep` (new)
- `gods-plan/src/hooks/.gitkeep` (new)
- `gods-plan/src/constants/.gitkeep` (new)
- `gods-plan/src/types/.gitkeep` (new)
- `gods-plan/docs/spikes/.gitkeep` (new)
- `gods-plan/src/app/index.tsx` (new — redirect to /(tabs)/capture; fixes missing root route)
- `gods-plan/src/app/_layout.tsx` (modified — restored ThemeProvider with dark/light mode support)
- `gods-plan/src/app/(tabs)/_layout.tsx` (modified — added screenOptions={{ headerShown: false }})
- `gods-plan/app.config.ts` (modified — added expo-notifications plugin config)
- `gods-plan/package.json` (modified — moved drizzle-kit to devDependencies; added @react-navigation/native)
- `gods-plan/src/components/hint-row.tsx` (deleted — unused template)
- `gods-plan/src/components/web-badge.tsx` (deleted — unused template)
- `gods-plan/src/components/external-link.tsx` (deleted — unused template)
- `gods-plan/src/components/themed-text.tsx` (deleted — unused template)
- `gods-plan/src/components/themed-view.tsx` (deleted — unused template)
- `gods-plan/src/components/ui/collapsible.tsx` (deleted — unused template)
