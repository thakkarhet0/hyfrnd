# Story 1.4: i18n Infrastructure and Language Files

Status: done

## Story

As a developer,
I want react-i18next initialized with translation files for Hindi, Gujarati, and English,
so that all copy in the app can be language-gated from the first story that uses text.

## Acceptance Criteria

1. **Given** Story 1.1 is complete **When** `src/constants/i18n/index.ts` is imported **Then** `react-i18next` is configured with `i18next` and initialized synchronously (resources are bundled — no async backend) before any screen renders
2. **And** translation files exist at `src/constants/i18n/locales/en.json`, `hi.json`, `gu.json`
3. **And** each file contains at minimum: tab labels, capture screen labels, processing copy, extraction review labels, notification copy (morning/afternoon/evening nudges), and common action labels (confirm, cancel, save, delete)
4. **And** all copy in the app shell (tab labels in `(tabs)/_layout.tsx`, placeholder text in `capture.tsx`, `contacts.tsx`, `settings.tsx`) uses `t('key')` — no hardcoded strings
5. **And** switching the active language at runtime via `i18n.changeLanguage('en' | 'hi' | 'gu')` updates all visible copy without restart
6. **And** `src/constants/languages.ts` exports `LanguageCode` type (`'en' | 'hi' | 'gu'`), `SUPPORTED_LANGUAGES` record with `label` + `sarvamCode` per language, and `DEFAULT_LANGUAGE = 'hi'`
7. **And** `npx tsc --noEmit` passes with zero errors and `npm run lint` passes with zero warnings

## Tasks / Subtasks

- [x] Task 1: Create `src/constants/languages.ts` (AC: 6)
  - [x] Export `LanguageCode` type: `'en' | 'hi' | 'gu'`
  - [x] Export `SUPPORTED_LANGUAGES` with `label` (display name) and `sarvamCode` (Sarvam AI API code) per language: `en → 'en-IN'`, `hi → 'hi-IN'`, `gu → 'gu-IN'`
  - [x] Export `DEFAULT_LANGUAGE: LanguageCode = 'hi'`
- [x] Task 2: Create translation JSON files (AC: 2, 3)
  - [x] Create `src/constants/i18n/locales/en.json` with all required keys in English
  - [x] Create `src/constants/i18n/locales/hi.json` with all required keys in Hindi
  - [x] Create `src/constants/i18n/locales/gu.json` with all required keys in Gujarati
- [x] Task 3: Create `src/constants/i18n/index.ts` — initialize i18next at module scope (AC: 1, 5)
  - [x] Import `i18next`, `initReactI18next` from their packages
  - [x] Import all three locale JSON files
  - [x] Call `i18n.use(initReactI18next).init({ resources, lng: 'hi', fallbackLng: 'hi', interpolation: { escapeValue: false } })`
  - [x] Export `i18n` as default
- [x] Task 4: Wire i18n into `src/app/_layout.tsx` (AC: 1)
  - [x] Add `import '@/constants/i18n'` as the FIRST import (ensures i18n is initialized before any component renders)
  - [x] Preserve all existing DB init, error UI, and splash screen logic exactly
- [x] Task 5: Update tab screens to use `t()` (AC: 4, 5)
  - [x] `(tabs)/_layout.tsx`: import `useTranslation`, replace hardcoded tab titles with `t('tabs.capture')`, `t('tabs.contacts')`, `t('tabs.settings')`
  - [x] `(tabs)/capture.tsx`: import `useTranslation`, replace hardcoded text with `t('capture.title')`
  - [x] `(tabs)/contacts.tsx`: import `useTranslation`, replace hardcoded text with `t('tabs.contacts')`
  - [x] `(tabs)/settings.tsx`: import `useTranslation`, replace hardcoded text with `t('tabs.settings')`
- [x] Task 6: Validate (AC: 7)
  - [x] Run `npx tsc --noEmit` — zero errors
  - [x] Run `npm run lint` — zero warnings

## Dev Notes

### Architecture Requirements

- **Library**: `react-i18next` + `i18next` — both already installed (`i18next: ^26.3.0`, `react-i18next: ^17.0.8`). No install needed.
- **Fallback language**: `'hi'` (Hindi) — not English. This is intentional: target users are Hindi/Gujarati speakers.
- **Initialization order**: i18n BEFORE DB init. Import `'@/constants/i18n'` as the first import in `_layout.tsx` so the module evaluates before any component or hook runs.
- **No async backend**: Resources are bundled as JSON imports. `i18next.init()` with bundled resources resolves synchronously — no need to await or use Suspense.
- **No `<I18nextProvider>` needed**: `initReactI18next` plugin wires i18next globally. `useTranslation()` hooks work without an explicit Provider wrapper.
- **Key naming**: dot-notation namespaced by screen — `capture.recordButton`, `notifications.morning`, `tabs.capture`. No underscores, no flat keys.
- [Source: _bmad-output/planning-artifacts/architecture.md — "Internationalisation (i18n)" section, line 235–255]

### File Paths (use `src/` prefix — architecture doc omits it)

```
src/constants/
  languages.ts                    ← NEW
  i18n/
    index.ts                      ← NEW
    locales/
      en.json                     ← NEW
      hi.json                     ← NEW
      gu.json                     ← NEW
src/app/
  _layout.tsx                     ← MODIFY (add import)
  (tabs)/
    _layout.tsx                   ← MODIFY (use t())
    capture.tsx                   ← MODIFY (use t())
    contacts.tsx                  ← MODIFY (use t())
    settings.tsx                  ← MODIFY (use t())
```

### Current State of Files Being Modified

**`src/app/(tabs)/_layout.tsx`** — current:
```typescript
import { Tabs } from 'expo-router';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="capture" options={{ title: 'capture' }} />
      <Tabs.Screen name="contacts" options={{ title: 'contacts' }} />
      <Tabs.Screen name="settings" options={{ title: 'settings' }} />
    </Tabs>
  );
}
```
Change: add `useTranslation`, replace string literals with `t('tabs.*')`.

**`src/app/(tabs)/capture.tsx`** — current:
```typescript
import { View, Text } from 'react-native';
export default function CaptureScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>capture</Text>
    </View>
  );
}
```
Change: use `t('capture.title')`.

**`src/app/(tabs)/contacts.tsx`** and **`settings.tsx`** — same pattern, use `t('tabs.contacts')` and `t('tabs.settings')`.

**`src/app/_layout.tsx`** — add `import '@/constants/i18n'` as the FIRST line (before React Navigation, SplashScreen, etc). ALL existing logic preserved exactly.

### Translation Key Schema

All three JSON files must implement this exact key structure:

```json
{
  "tabs": {
    "capture": "...",
    "contacts": "...",
    "settings": "..."
  },
  "capture": {
    "title": "...",
    "recordButton": "...",
    "processing": "...",
    "processingSubtitle": "..."
  },
  "extraction": {
    "reviewTitle": "...",
    "namePrompt": "...",
    "contextPrompt": "...",
    "followUpPrompt": "...",
    "confirmButton": "...",
    "editButton": "..."
  },
  "notifications": {
    "morning": "...",
    "afternoon": "...",
    "evening": "..."
  },
  "common": {
    "confirm": "...",
    "cancel": "...",
    "save": "...",
    "delete": "..."
  }
}
```

### Translation Content Reference

**`en.json`**:
```json
{
  "tabs": { "capture": "Capture", "contacts": "Contacts", "settings": "Settings" },
  "capture": {
    "title": "Capture",
    "recordButton": "Hold to record",
    "processing": "Processing…",
    "processingSubtitle": "Extracting details from your voice note"
  },
  "extraction": {
    "reviewTitle": "Review",
    "namePrompt": "Who is this about?",
    "contextPrompt": "What did you want to note?",
    "followUpPrompt": "When to follow up?",
    "confirmButton": "Confirm",
    "editButton": "Edit"
  },
  "notifications": {
    "morning": "Good morning! Time to connect with someone.",
    "afternoon": "Good afternoon! Follow up on your notes.",
    "evening": "Good evening! Review your day's connections."
  },
  "common": { "confirm": "Confirm", "cancel": "Cancel", "save": "Save", "delete": "Delete" }
}
```

**`hi.json`**:
```json
{
  "tabs": { "capture": "रिकॉर्ड", "contacts": "संपर्क", "settings": "सेटिंग्स" },
  "capture": {
    "title": "रिकॉर्ड",
    "recordButton": "रिकॉर्ड करने के लिए दबाएं",
    "processing": "प्रोसेसिंग…",
    "processingSubtitle": "आपके वॉयस नोट से जानकारी निकाली जा रही है"
  },
  "extraction": {
    "reviewTitle": "समीक्षा",
    "namePrompt": "यह किसके बारे में है?",
    "contextPrompt": "आप क्या नोट करना चाहते थे?",
    "followUpPrompt": "कब फ़ॉलो अप करें?",
    "confirmButton": "पुष्टि करें",
    "editButton": "संपादित करें"
  },
  "notifications": {
    "morning": "सुप्रभात! किसी से जुड़ने का समय है।",
    "afternoon": "नमस्ते! अपने नोट्स पर फ़ॉलो अप करें।",
    "evening": "शुभ संध्या! आज के संपर्कों की समीक्षा करें।"
  },
  "common": { "confirm": "पुष्टि करें", "cancel": "रद्द करें", "save": "सहेजें", "delete": "हटाएं" }
}
```

**`gu.json`**:
```json
{
  "tabs": { "capture": "રેકોર્ડ", "contacts": "સંપર્ક", "settings": "સેટિંગ્સ" },
  "capture": {
    "title": "રેકોર્ડ",
    "recordButton": "રેકોર્ડ કરવા માટે દબાવો",
    "processing": "પ્રોસેસિંગ…",
    "processingSubtitle": "તમારી વૉઇસ નૉટમાંથી વિગતો કાઢવામાં આવી રહી છે"
  },
  "extraction": {
    "reviewTitle": "સમીક્ષા",
    "namePrompt": "આ કોના વિશે છે?",
    "contextPrompt": "તમે શું નૉટ કરવા માંગતા હતા?",
    "followUpPrompt": "ક્યારે ફૉલો અપ કરવું?",
    "confirmButton": "પુષ્ટિ કરો",
    "editButton": "સંપાદિત કરો"
  },
  "notifications": {
    "morning": "શુભ સવાર! કોઈ સાથે જોડાવાનો સમય છે.",
    "afternoon": "નમસ્તે! તમારી નૉટ્સ પર ફૉલો અપ કરો.",
    "evening": "શુભ સાંજ! આજના સંપર્કોની સમીક્ષા કરો."
  },
  "common": { "confirm": "પુષ્ટિ કરો", "cancel": "રદ કરો", "save": "સાચવો", "delete": "કાઢી નાખો" }
}
```

### i18n Init Pattern

```typescript
// src/constants/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import gu from './locales/gu.json';
import hi from './locales/hi.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    gu: { translation: gu },
  },
  lng: 'hi',
  fallbackLng: 'hi',
  interpolation: { escapeValue: false },
});

export default i18n;
```

### `_layout.tsx` Import Order

The import MUST be first — before React Navigation, SplashScreen, React, anything:
```typescript
import '@/constants/i18n'; // must be first — initializes i18n before any render
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// ... rest of existing imports unchanged
```

### Languages Constant

```typescript
// src/constants/languages.ts
export type LanguageCode = 'en' | 'hi' | 'gu';

export const SUPPORTED_LANGUAGES: Record<LanguageCode, { label: string; sarvamCode: string }> = {
  en: { label: 'English', sarvamCode: 'en-IN' },
  hi: { label: 'हिंदी', sarvamCode: 'hi-IN' },
  gu: { label: 'ગુજરાતી', sarvamCode: 'gu-IN' },
};

export const DEFAULT_LANGUAGE: LanguageCode = 'hi';
```

### No Test Runner

No Jest configured in this project. Validation: `npx tsc --noEmit` + `npm run lint` only.

### Previous Story Learnings

- File paths always use `src/` prefix (architecture doc omits it)
- Import alias `@/` maps to `./src/`
- `npx tsc --noEmit` + `npm run lint` are the two validation commands
- No test runner — validation is compile + lint only

### Project Structure Notes

The `src/constants/` directory exists (`src/constants/.gitkeep`, `src/constants/theme.ts`). Create `i18n/` as a subdirectory there. Create `languages.ts` at `src/constants/languages.ts`.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-1-project-foundation.md — Story 1.4 ACs]
- [Source: _bmad-output/planning-artifacts/architecture.md — i18n section, lines 235–255]
- [Source: _bmad-output/planning-artifacts/architecture.md — directory structure, line 504–506]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/constants/languages.ts` (new): Exports `LanguageCode` union type (`'en' | 'hi' | 'gu'`), `SUPPORTED_LANGUAGES` record with `label` and `sarvamCode` per language, and `DEFAULT_LANGUAGE = 'hi'`.
- `src/constants/i18n/locales/en.json` (new): English translations for all required key groups: tabs, capture, extraction, notifications, common.
- `src/constants/i18n/locales/hi.json` (new): Hindi translations for all required key groups.
- `src/constants/i18n/locales/gu.json` (new): Gujarati translations for all required key groups.
- `src/constants/i18n/index.ts` (new, then updated post-review): Initializes i18next with `initReactI18next` plugin at module scope using bundled JSON resources. `lng` derives from `DEFAULT_LANGUAGE` (imported from `@/constants/languages`); `fallbackLng: 'en'` so missing translations in any language fall back to English rather than rendering raw key strings. `react: { useSuspense: false }` prevents latent crash if an async backend plugin is ever added.
- `src/app/_layout.tsx` (modified): Added `import '@/constants/i18n'` as the first import — ensures i18n is initialized synchronously before any component renders. Error UI uses `useTranslation` + `t('errors.storageError')` / `t('errors.storageErrorBody')` so Hindi/Gujarati speakers see localized error messages.
- `src/app/(tabs)/_layout.tsx` (modified): Added `useTranslation` hook, replaced hardcoded tab title strings with `t('tabs.capture')`, `t('tabs.contacts')`, `t('tabs.settings')`.
- `src/app/(tabs)/capture.tsx` (modified): Added `useTranslation`, replaced `<Text>capture</Text>` with `<Text>{t('capture.title')}</Text>`.
- `src/app/(tabs)/contacts.tsx` (modified): Added `useTranslation`, replaced hardcoded text with `t('contacts.title')` (dedicated screen-level key, separate from tab label).
- `src/app/(tabs)/settings.tsx` (modified): Added `useTranslation`, replaced hardcoded text with `t('settings.title')` (dedicated screen-level key, separate from tab label).
- All three locale JSON files updated with `contacts.title`, `settings.title`, and `errors.storageError`/`errors.storageErrorBody` keys.
- `npx tsc --noEmit` — zero errors. `npm run lint` — zero warnings.

### File List

- `gods-plan/src/constants/languages.ts` (new)
- `gods-plan/src/constants/i18n/index.ts` (new)
- `gods-plan/src/constants/i18n/locales/en.json` (new)
- `gods-plan/src/constants/i18n/locales/hi.json` (new)
- `gods-plan/src/constants/i18n/locales/gu.json` (new)
- `gods-plan/src/app/_layout.tsx` (modified — added i18n import as first line)
- `gods-plan/src/app/(tabs)/_layout.tsx` (modified — useTranslation + t() for tab titles)
- `gods-plan/src/app/(tabs)/capture.tsx` (modified — useTranslation + t('capture.title'))
- `gods-plan/src/app/(tabs)/contacts.tsx` (modified — useTranslation + t('contacts.title'))
- `gods-plan/src/app/(tabs)/settings.tsx` (modified — useTranslation + t('settings.title'))

### Change Log

- Story 1.4 implemented: i18n infrastructure with react-i18next, three locale files (en/hi/gu), languages.ts constants, and all tab screens updated to use t() (2026-06-04)
- Post-review fixes applied: fallbackLng changed to 'en' (C1 — was no-op fallback to same language); error UI localized with useTranslation (C2 — hardcoded English bypassed i18n for Hindi/Gujarati users); useSuspense:false added to init options (C3 — latent crash if async backend added); lng now derived from DEFAULT_LANGUAGE constant (C4 — decoupled source of truth); contacts/settings screens use screen-scoped t() keys (C5 — tab label key reused as screen heading) (2026-06-04)
