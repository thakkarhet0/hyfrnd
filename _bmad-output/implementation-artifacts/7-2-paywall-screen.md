# Story 7.2: Paywall Screen

Status: done

## Story

As a user,
I want the paywall to feel like a natural continuation of what I was doing, not a hard stop,
So that upgrading feels like enabling more, not being punished.

## Acceptance Criteria

1. **Given** the freemium gate is triggered (contact count = 10), **When** the paywall screen appears, **Then** it shows `₹400/month` with a 7-day free trial as the primary offer (UX-DR13)
2. **Given** `extractedName` is available in `useCaptureStore`, **When** the paywall renders, **Then** the copy references the contact the user was about to save (e.g. "you're about to save rajesh")
3. **Given** the paywall is shown, **Then** it includes: "subscribe" button, "not now" button, and "restore purchase" button (iOS only — hidden on Android)
4. **Given** the user taps "not now", **Then** `captureStore.reset()` is called and `router.replace('/(tabs)/contacts')` navigates home — memo stays in DB as an unlinked draft (audio on disk, no contact_id)
5. **Given** Android back button is pressed on the paywall, **Then** behaves identically to "not now" (draft preserved, home navigation)
6. **Given** the paywall renders, **Then** there are no countdown timers, false scarcity claims, or dark patterns (UX-DR13)
7. **Given** the "subscribe" button is tapped, **Then** the action is stubbed (placeholder) — Story 7-3 replaces this with real IAP
8. **Given** the "restore purchase" button is tapped (iOS only), **Then** the action is stubbed (placeholder) — Story 7-4 replaces this with real restore flow

## Tasks / Subtasks

- [x] Task 1: Replace `src/app/paywall.tsx` stub with the real paywall screen (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Import `useCaptureStore` and read `extractedName`
  - [x] Render personalized headline using `extractedName`
  - [x] Render pricing copy: "₹400/month · 7-day free trial · unlimited contacts"
  - [x] Render "subscribe" button (stub — `console.log('[Paywall] subscribe tapped')`)
  - [x] Render "restore purchase" button, iOS only (`Platform.OS === 'ios'`)
  - [x] Render "not now" button → `captureStore.reset()` → `router.replace('/(tabs)/contacts')`
  - [x] Wire Android `BackHandler` in `useEffect` to call the same "not now" handler
  - [x] Use design system: `useTheme()`, `Typography`, `FONT_BOLD/FONT_REGULAR`, `Spacing`, `Radius.none`

- [x] Task 2: Verify `npx tsc --noEmit` passes cleanly

## Dev Notes

### Overview

Story 7-1 created a minimal `src/app/paywall.tsx` stub so Expo Router typed routes would compile. This story replaces that stub with the real screen.

The paywall appears mid-capture when the user has 10 contacts and tries to create an 11th. By the time the user sees the paywall, the memo is already in the DB (status=extracted, audio on disk). "Not now" simply resets the capture store and goes home — the memo row stays in the DB as an unlinked record (no `contact_id`). No explicit "draft" DB update is needed.

Story 7-3 will implement the actual IAP (subscribe button). Story 7-4 will implement restore. This story only builds the screen UI and "not now" flow.

---

### Task 1 Details: `src/app/paywall.tsx`

Replace the stub entirely. Full implementation:

```tsx
import { useEffect } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCaptureStore } from '@/stores/capture.store';

export default function PaywallScreen() {
  const theme = useTheme();
  const { extractedName, reset } = useCaptureStore();

  const handleNotNow = () => {
    reset();
    router.replace('/(tabs)/contacts');
  };

  const handleSubscribe = () => {
    // Story 7-3 replaces this with real IAP
    console.log('[Paywall] subscribe tapped');
  };

  const handleRestore = () => {
    // Story 7-4 replaces this with real restore flow
    console.log('[Paywall] restore tapped');
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleNotNow();
      return true; // prevent default back behaviour
    });
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contactRef = extractedName
    ? `you were about to save ${extractedName}.`
    : 'you hit the free contact limit.';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.top}>
        <Text style={[styles.anchor, { color: theme.text }]}>{contactRef}</Text>
        <Text style={[styles.headline, { color: theme.text }]}>
          upgrade to keep capturing.
        </Text>
        <Text style={[styles.pricing, { color: theme.cta }]}>
          ₹400/month · 7-day free trial · unlimited contacts
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: theme.cta }]}
          onPress={handleSubscribe}
          accessibilityRole="button"
          accessibilityLabel="subscribe for ₹400 per month with 7-day free trial"
        >
          <Text style={[styles.primaryLabel, { color: theme.background }]}>
            start free trial
          </Text>
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: theme.cta }]}
            onPress={handleRestore}
            accessibilityRole="button"
            accessibilityLabel="restore previous purchase"
          >
            <Text style={[styles.secondaryLabel, { color: theme.cta }]}>
              restore purchase
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.ghostBtn}
          onPress={handleNotNow}
          accessibilityRole="button"
          accessibilityLabel="not now, go back to contacts"
        >
          <Text style={[styles.ghostLabel, { color: theme.text }]}>not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: 80,
    justifyContent: 'space-between',
  },
  top: {
    gap: Spacing.xl,
  },
  anchor: {
    ...Typography.body,
  },
  headline: {
    ...Typography.display,
  },
  pricing: {
    ...Typography.subheading,
  },
  actions: {
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  primaryBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radius.none,
  },
  primaryLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  secondaryBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.none,
    borderWidth: 1,
  },
  secondaryLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  ghostBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ghostLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
    opacity: 0.6,
  },
});
```

**Key decisions:**
- `router.replace('/(tabs)/contacts')` — uses replace (not push) so user cannot navigate back to the paywall
- `BackHandler` cleanup returns `true` to prevent default back behavior on Android
- "start free trial" instead of "subscribe" — warmer copy matching trial-first framing
- `extractedName` is read directly from `useCaptureStore` (not from route params) — the store is still populated when the paywall mounts (the capture store is only reset on "not now" or capture complete)
- No `useTranslation` — pricing copy in INR is always in English regardless of app language
- `accessibilityLabel` on every button — all buttons are meaningful actions

**What NOT to do:**
- Do NOT call `captureStore.reset()` anywhere except in the "not now" handler — the subscribe flow (Story 7-3) needs the capture state to resume seamlessly after purchase
- Do NOT add countdown timers, "only X spots left", urgency copy, or confetti — UX-DR13 explicitly forbids dark patterns
- Do NOT use `router.push` for navigation after "not now" — must use `router.replace` to clear the paywall from the stack
- Do NOT show the "restore purchase" button on Android — Play Store handles restore automatically
- Do NOT add `isPending` loading state for subscribe/restore — Story 7-3 and 7-4 will add that

---

### Design System Reference

All from `src/constants/theme.ts`:

| Token | Value |
|---|---|
| `Typography.display` | Space Mono Bold, 32px, lowercase, letterSpacing 2.5 |
| `Typography.subheading` | Space Mono Regular, 20px, lowercase |
| `Typography.body` | Space Mono Regular, 16px, lowercase |
| `Spacing.lg` | 24 |
| `Spacing.xl` | 32 |
| `Spacing.xxl` | 64 |
| `Radius.none` | 0 |
| `theme.cta` | #365486 (light) / #7FC7D9 (dark) |
| `theme.background` | #DCF2F1 (light) / #0F1035 (dark) |
| `theme.text` | #0F1035 (light) / #DCF2F1 (dark) |

---

### Critical Patterns to Preserve

**Capture store state:** `useCaptureStore().extractedName` holds the name the user tried to save. This is populated when the paywall mounts (the gate fires in `handleSaveNew` BEFORE `dispatch({ type: 'LINKING' })`, so the store is not yet reset). Do NOT reset the store on mount — only on "not now".

**Draft preservation (FR49):** The memo row in DB already has: audio_path, transcript, extracted fields, status=extracted. It just lacks a `contact_id`. No DB write is needed on "not now" — the row stays as-is. On the next app open, `_layout.tsx` will not auto-resume the capture (there's no draft resume flow in current stories). The unlinked memo is an acceptable orphan state.

**Navigation stack integrity:** The Expo Router stack at paywall entry is:
`(tabs)/capture → contact-linking → paywall`

`router.replace('/(tabs)/contacts')` replaces the entire stack with the contacts tab. This is correct — the user should not be able to press back to return to a stale contact-linking screen.

**BackHandler cleanup:** `sub.remove()` is the correct Expo SDK 56 cleanup pattern. Do NOT use `.removeEventListener()`.

**`useEffect` deps:** `handleNotNow` is defined inside the component but called in `useEffect`. Since `reset` from Zustand is a stable reference, the ESLint disable is appropriate.

---

### Files to NOT touch

| File | Reason |
|---|---|
| `src/app/contact-linking.tsx` | Story 7-1 already added `router.push('/paywall')` — no change needed |
| `src/stores/capture.store.ts` | `reset()` already exists — no new fields needed |
| `src/stores/subscription.store.ts` | Story 7-3 will call `setPlanTier` on purchase |
| `src/services/payments.service.ts` | Story 7-3 creates this |
| Any DB migration | No schema changes needed |

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual verification:
1. With 10 contacts: record → complete capture → contact linking → tap "save as new contact" → paywall appears with the extracted name in the copy
2. On paywall: tap "not now" → memo preserved in DB, capture store is reset, navigates to contacts tab
3. On Android: press hardware back button → same as "not now" (verify in emulator)
4. On iOS: "restore purchase" button visible; on Android: "restore purchase" button NOT visible
5. No countdown timers or scarcity copy anywhere on screen

---

### File List

- `src/app/paywall.tsx` (UPDATE — replace stub with real screen)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Task 1: `src/app/paywall.tsx` replaced with full screen. Personalized anchor copy from `useCaptureStore.extractedName`. Subscribe and restore are stubs. "Not now" resets capture store and navigates to `/(tabs)/contacts`. BackHandler wired for Android. Design system used throughout.
- Task 2: Pre-existing tsc error in `_layout.tsx:164` (NativeTheme/Theme mismatch, unrelated to this story). `paywall.tsx` has no type errors.

### Change Log

- 2026-06-16: Story created. Status → ready-for-dev.
- 2026-06-16: Implementation complete. All tasks done. Status → review.
- 2026-06-16: Code review complete. 2 PLAUSIBLE findings: [LOW] reset() before navigate() swapped to avoid store flash on slow devices; [LOW] subscribe/restore stubs give no user feedback — intentional per story ACs, Story 7-3 fixes. Status → done.
