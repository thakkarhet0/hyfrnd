# Story 4.2: Welcome Screen

Status: ready-for-dev

## Story

As a new user,
I want to understand what the app does in one sentence,
so that I know what I'm about to try before I commit to the first capture.

## Acceptance Criteria

1. **Given** language is selected and `/onboarding/welcome` is shown, **Then** a single headline in the selected language appears: equivalent of "speak about someone. the app remembers."
2. **Then** a single CTA button ("let's try it" equivalent in the selected language) is the only interactive element
3. **Then** tapping the CTA navigates to the next onboarding step — `/onboarding/capture` (for Story 4.4); for now, stub to that route
4. **Then** no other content is on the screen — single focus (UX-DR15)
5. **Then** no progress bar or step indicator is shown
6. **Then** all text is at minimum 16sp (NFR21), Space Mono font, flat edges, design-system colours

## Tasks / Subtasks

- [ ] Task 1: Replace stub `app/onboarding/welcome.tsx` with real screen (AC: 1–6)
  - [ ] Headline: `t('onboarding.welcomeHeadline')` — full-width, large text, centred
  - [ ] CTA button: `t('onboarding.letsGo')` — full-width, background `theme.cta`, text `theme.background`
  - [ ] On CTA press: `store.setOnboardingStep('first_capture')` then `router.replace('/onboarding/capture')`
  - [ ] No back gesture / no header
  - [ ] No progress indicator

- [ ] Task 2: Add i18n keys for welcome screen (AC: 1, 2)
  - [ ] `en.json`: `onboarding.welcomeHeadline` = "speak about someone. the app remembers.", `onboarding.letsGo` = "let's try it"
  - [ ] `hi.json`: `onboarding.welcomeHeadline` = "किसी के बारे में बोलें। ऐप याद रखेगा।", `onboarding.letsGo` = "चलो शुरू करें"
  - [ ] `gu.json`: `onboarding.welcomeHeadline` = "કોઈ વિશે બોલો. ઍપ યાદ રાખશે.", `onboarding.letsGo` = "ચાલો શરૂ કરીએ"

- [ ] Task 3: Create stub `app/onboarding/capture.tsx` so navigation target exists (AC: 3)
  - [ ] Minimal placeholder — Story 4.4 replaces it

- [ ] Task 4: Update sprint status

## Dev Notes

### Screen Layout

Single-focus screen: nothing to distract. Vertical stack centred in flex-1:

```
[spacer flex:1]
[headline — large text, centred, multiline ok]
[spacer 48]
[CTA button — full width, cta colour, borderRadius:0]
[spacer flex:1]
```

### i18n — Calling `useTranslation()` Here Works

By the time the user reaches welcome, `i18n.changeLanguage()` has already been called in the language screen. `useTranslation()` will return the correct locale. No special handling needed.

### Onboarding Step on This Screen

`store.setOnboardingStep('welcome')` was already called by Story 4.1 before navigating here. No need to call it again on mount.

### Design Constraints

- `textTransform: 'lowercase'` on all English/Latin text (design system rule)
- Hindi/Gujarati text: do NOT apply textTransform (it does nothing for Devanagari/Gujarati script but avoid it anyway for correctness)
- Min 16sp for all text, headline should be 28–32sp for impact
- CTA: full-width Pressable with `backgroundColor: theme.cta`, padding vertical 16

### Files to Create / Update

| File | Action |
|------|--------|
| `src/app/onboarding/welcome.tsx` | UPDATE — replace stub with real screen |
| `src/app/onboarding/capture.tsx` | NEW — stub placeholder |
| `src/constants/i18n/locales/en.json` | UPDATE — add `onboarding` section |
| `src/constants/i18n/locales/hi.json` | UPDATE — add `onboarding` section |
| `src/constants/i18n/locales/gu.json` | UPDATE — add `onboarding` section |

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
