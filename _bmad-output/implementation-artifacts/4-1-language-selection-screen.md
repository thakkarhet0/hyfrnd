# Story 4.1: Language Selection Screen

Status: review

## Story

As a new user,
I want to choose my language before anything else,
so that every screen, button, and notification I see is in my language from the start.

## Acceptance Criteria

1. **Given** the app is launched for the first time (onboarding not complete), **When** the app opens, **Then** `app/index.tsx` routes to `/onboarding/language` instead of `/(tabs)/capture`
2. **Given** the language screen is shown, **Then** three options are displayed — हिंदी, ગુજરાતી, English — each labelled in its own script with no dependency on the current i18n locale (NFR19)
3. **Given** the user taps a language option, **Then** `i18n.changeLanguage(lang)` is called, `useAppStore.setLanguage(lang)` is called, and `onboarding_step` in `useAppStore` is set to `'welcome'`
4. **Given** language is selected, **Then** the app navigates to `/onboarding/welcome` using `router.replace`
5. **Given** onboarding is already complete (`onboarding_complete === true` in app store), **When** the app opens, **Then** `app/index.tsx` routes to `/(tabs)/capture` as before — no regression
6. **Then** no progress indicator, step count, or back button is shown on the language screen (UX-DR15)
7. **Then** all text on the language screen is at minimum 16sp (NFR21)
8. **Then** the screen uses flat edges (borderRadius: 0), Space Mono font, and the design-system colour palette

## Tasks / Subtasks

- [ ] Task 1: Extend `app.store.ts` with onboarding state (AC: 1, 3, 5)
  - [ ] Add `onboarding_step: OnboardingStep | null` field (type: `'language' | 'welcome' | 'battery' | 'first_capture' | 'notifications' | 'complete'` — use `null` for pre-onboarding)
  - [ ] Add `onboarding_complete: boolean` field (default `false`)
  - [ ] Add `setOnboardingStep(step: OnboardingStep)` setter
  - [ ] Add `setOnboardingComplete(v: boolean)` setter
  - [ ] Keep existing `language` + `setLanguage` untouched

- [ ] Task 2: Update `app/index.tsx` to gate onboarding (AC: 1, 5)
  - [ ] Read `onboarding_complete` from `useAppStore`
  - [ ] If `false` → redirect to `/onboarding/language`
  - [ ] If `true` → redirect to `/(tabs)/capture` (existing behaviour)
  - [ ] Use `<Redirect>` from expo-router (same pattern as current index.tsx)

- [ ] Task 3: Create `app/onboarding/language.tsx` (AC: 2, 3, 4, 6, 7, 8)
  - [ ] Three Pressable options: `{ code: 'hi', label: 'हिंदी' }`, `{ code: 'gu', label: 'ગુજરાતી' }`, `{ code: 'en', label: 'English' }` — labels hardcoded, NOT from i18n
  - [ ] On press: call `i18n.changeLanguage(code)`, `store.setLanguage(code)`, `store.setOnboardingStep('welcome')`, then `router.replace('/onboarding/welcome')`
  - [ ] No header, no progress bar, no back affordance
  - [ ] Design: Space Mono, all text lowercase (except script labels — हिंदी/ગુજરાતી are proper nouns, render as-is), min 16sp, flat edges, design-system colours

- [ ] Task 4: Create stub `app/onboarding/welcome.tsx` so navigation target exists (AC: 4)
  - [ ] Minimal placeholder that renders the selected language name — just enough to confirm navigation works
  - [ ] Story 4.2 will replace this with the real screen

- [ ] Task 5: Update sprint status (AC: all)
  - [ ] Mark `4-1-language-selection-screen` as `review` in sprint-status.yaml

## Dev Notes

### Critical: Do NOT Read i18n for Language Labels on This Screen

The language selection screen appears BEFORE any locale is set. Reading `t('...')` here would produce whatever the default locale is (`hi`). Labels must be hardcoded string literals in their own script:

```ts
const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'hi', label: 'हिंदी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'en', label: 'English' },
];
```

### Changing the i18n Locale at Runtime

`i18n.changeLanguage(lang)` is async and returns a Promise. Call it and also update `useAppStore` synchronously:

```ts
import i18n from '@/constants/i18n';
import { useAppStore } from '@/stores/app.store';

const store = useAppStore();
await i18n.changeLanguage(code);        // updates react-i18next globally
store.setLanguage(code);                 // syncs Zustand
store.setOnboardingStep('welcome');
router.replace('/onboarding/welcome');
```

Subsequent screens (`/onboarding/welcome`) will automatically use the selected locale because `useTranslation()` reacts to `i18n.changeLanguage`.

### `app.store.ts` — Exact Shape to Add

```ts
export type OnboardingStep =
  | 'language'
  | 'welcome'
  | 'battery'
  | 'first_capture'
  | 'notifications'
  | 'complete';

interface AppState {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  onboarding_step: OnboardingStep | null;     // ADD
  setOnboardingStep: (step: OnboardingStep) => void;  // ADD
  onboarding_complete: boolean;               // ADD
  setOnboardingComplete: (v: boolean) => void; // ADD
}

export const useAppStore = create<AppState>((set) => ({
  language: DEFAULT_LANGUAGE,
  setLanguage: (language) => set({ language }),
  onboarding_step: null,                      // ADD
  setOnboardingStep: (onboarding_step) => set({ onboarding_step }), // ADD
  onboarding_complete: false,                 // ADD
  setOnboardingComplete: (onboarding_complete) => set({ onboarding_complete }), // ADD
}));
```

Story 4.6 will add SQLite persistence on top of this shape — do NOT add persistence here.

### `app/index.tsx` — Updated Routing Gate

```tsx
import { Redirect } from 'expo-router';
import { useAppStore } from '@/stores/app.store';

export default function Index() {
  const onboarding_complete = useAppStore((s) => s.onboarding_complete);
  if (onboarding_complete) {
    return <Redirect href="/(tabs)/capture" />;
  }
  return <Redirect href="/onboarding/language" />;
}
```

### Design System Constraints (from Epic 2 established patterns)

- Font: `FONT_REGULAR = 'SpaceMono_400Regular'`, `FONT_BOLD = 'SpaceMono_700Bold'`
- Colours via `useTheme()` from `@/hooks/use-theme` → `{ background, text, cta, accent }`
- Min font size: **16sp** for all text (NFR21)
- Border radius: **0** (flat edges — no rounded corners anywhere)
- Text: `textTransform: 'lowercase'` on English text; script labels (हिंदी, ગુજરાતી) render as-is
- Spacing: use `Spacing.{xs,sm,md,lg,xl}` from `@/constants/theme`

### Routing Architecture — Onboarding Lives Under `app/onboarding/`

New directory: `src/app/onboarding/`. Expo Router auto-discovers it. Routes become:
- `/onboarding/language` → `app/onboarding/language.tsx`
- `/onboarding/welcome` → `app/onboarding/welcome.tsx` (stub for 4.1, full impl in 4.2)
- etc.

No `_layout.tsx` needed inside `onboarding/` — the root stack layout in `app/_layout.tsx` handles the full screen stack. All onboarding screens are full-screen, no header.

### ESLint Rules to Watch

- `import/first`: all imports before any non-import statements
- `@typescript-eslint/array-type`: use `T[]` not `Array<T>`
- `react-hooks/set-state-in-effect`: no synchronous setState in useEffect body — use `router.replace` directly in an async handler, not inside a useEffect

### No Onboarding `_layout.tsx` Needed

Do NOT create `app/onboarding/_layout.tsx`. The root `app/_layout.tsx` `<Stack>` handles all screens including onboarding. Adding a nested layout would create a nested stack and complicate back-navigation.

### Stub `app/onboarding/welcome.tsx`

Just enough to prevent a "route not found" crash when language is selected:

```tsx
import { View, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { FONT_REGULAR } from '@/constants/theme';

export default function WelcomeScreen() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: FONT_REGULAR, fontSize: 16, color: theme.text }}>welcome</Text>
    </View>
  );
}
```

Story 4.2 replaces this entire file.

### Files to Create / Update

| File | Action |
|------|--------|
| `src/stores/app.store.ts` | UPDATE — add `OnboardingStep` type + 4 new fields |
| `src/app/index.tsx` | UPDATE — add onboarding gate |
| `src/app/onboarding/language.tsx` | NEW — language selection screen |
| `src/app/onboarding/welcome.tsx` | NEW — stub placeholder |

### Project Structure Notes

- `app/onboarding/` is a new directory under `src/app/` — consistent with existing pattern where each feature area gets its own directory (e.g., `app/contact/`)
- `app.store.ts` only grows — existing `language` + `setLanguage` are preserved unchanged
- No new npm packages required
- No DB schema changes — persistence deferred to Story 4.6

### References

- Epic 4 onboarding spec: `_bmad-output/planning-artifacts/epics/epic-4-onboarding.md`
- Architecture i18n section: `_bmad-output/planning-artifacts/architecture.md#Internationalisation`
- Languages constant: `src/constants/languages.ts`
- i18n init: `src/constants/i18n/index.ts`
- App store (current): `src/stores/app.store.ts`
- Design system: `src/constants/theme.ts`, `src/hooks/use-theme.ts`
- Epic 2 screen patterns (for design conformance): `src/app/(tabs)/contacts.tsx`, `src/app/extraction-review.tsx`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
