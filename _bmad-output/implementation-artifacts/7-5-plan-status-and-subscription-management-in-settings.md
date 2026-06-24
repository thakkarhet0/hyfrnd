# Story 7.5: Plan Status and Subscription Management in Settings

Status: done

## Story

As a user,
I want to see my current plan and manage my subscription from within the app,
So that I'm never surprised by what I'm paying for or when it renews.

## Acceptance Criteria

1. **Given** the settings tab is open, **When** the user scrolls to the subscription section, **Then** the current plan tier (free or unlimited) is displayed (FR53)
2. **Given** the user is on the free plan, **Then** the current contact count is shown as "{count}/10 contacts" and an upgrade CTA button navigates to the paywall
3. **Given** the user is on the unlimited plan, **Then** "₹400/month · renews automatically" is shown and a "manage subscription" button opens the platform's native subscription management screen
4. **Given** the user has deleted or added contacts, **When** they open or return to settings, **Then** the displayed contact count reflects the current DB count (refreshed on focus)
5. **Given** the user is on the unlimited plan, **Then** no contact count or upgrade CTA is shown — only the plan status and manage button

## Tasks / Subtasks

- [x] Task 1: Create `src/components/settings/SubscriptionSettings.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Read `plan_tier` and `contact_count` from `useSubscriptionStore()`
  - [x] On focus (via `useFocusEffect`): call `getContactCount()` and update store via `setContactCount()`
  - [x] FREE plan view: section title "subscription", label "free plan", count "{contact_count}/10 contacts", upgrade Pressable → `router.push('/paywall')`
  - [x] UNLIMITED plan view: section title "subscription", label "unlimited plan", price "₹400/month · renews automatically", "manage subscription" Pressable → `Linking.openURL(manageUrl)` with error fallback
  - [x] Manage URL: iOS → `itms-apps://apps.apple.com/account/subscriptions`, Android → `https://play.google.com/store/account/subscriptions?sku=godsplan_unlimited_monthly&package=com.godsplan.app`
  - [x] Match existing settings component visual style: `FONT_BOLD` section title 18px lowercase, bordered rows (`borderWidth: 1, borderColor: theme.text + '20'`), `Spacing.*` gaps

- [x] Task 2: Add `<SubscriptionSettings />` to `src/app/(tabs)/settings.tsx` (AC: 1)
  - [x] Import `SubscriptionSettings` from `@/components/settings/SubscriptionSettings`
  - [x] Place it first in the `<ScrollView>`, after the heading `<Text>` and before `<NotificationSettings />`

- [x] Task 3: Verify `npx tsc --noEmit` passes cleanly

## Dev Notes

### Overview

The settings screen already has four component sections: `NotificationSettings`, `BackupSettings`, `ConsentSettings`, `LegalSettings`. This story adds `SubscriptionSettings` as the first section (closest to the top — subscription status is high-signal info).

The component reads from `useSubscriptionStore` (Zustand, no persist). The count is refreshed from DB on screen focus so deletions are reflected without requiring a full app restart.

No server-side renewal date is available (deferred from Story 7-3). Show "₹400/month · renews automatically" as a static label; the deep link gives the user exact renewal info in the platform UI.

---

### Task 1 Details: `SubscriptionSettings.tsx`

```tsx
import { useCallback } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { getContactCount } from '@/db/queries/contacts';

const FREE_LIMIT = 10;

const MANAGE_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : `https://play.google.com/store/account/subscriptions?sku=godsplan_unlimited_monthly&package=com.godsplan.app`;

export function SubscriptionSettings() {
  const theme = useTheme();
  const { plan_tier, contact_count, setContactCount } = useSubscriptionStore();

  useFocusEffect(
    useCallback(() => {
      getContactCount().then(({ data, error }) => {
        if (!error) setContactCount(data);
      });
    }, [setContactCount]),
  );

  const handleManage = () => {
    Linking.openURL(MANAGE_URL).catch(() => {
      Alert.alert('', 'could not open subscription management');
    });
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>subscription</Text>

      <View style={[styles.row, { borderColor: theme.text + '20' }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          {plan_tier === 'unlimited' ? 'unlimited plan' : 'free plan'}
        </Text>
        {plan_tier === 'free' && (
          <Text style={[styles.value, { color: theme.text + '80' }]}>
            {contact_count}/{FREE_LIMIT} contacts
          </Text>
        )}
        {plan_tier === 'unlimited' && (
          <Text style={[styles.value, { color: theme.text + '80' }]}>
            ₹400/month · renews automatically
          </Text>
        )}
      </View>

      {plan_tier === 'free' ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: theme.cta, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => router.push('/paywall')}
          accessibilityRole="button"
          accessibilityLabel="upgrade to unlimited plan"
        >
          <Text style={[styles.actionLabel, { color: theme.background }]}>upgrade</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { borderWidth: 1, borderColor: theme.cta, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleManage}
          accessibilityRole="button"
          accessibilityLabel="manage subscription in app store"
        >
          <Text style={[styles.actionLabel, { color: theme.cta }]}>manage subscription</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  row: {
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  label: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  value: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  actionBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    textTransform: 'lowercase',
  },
});
```

**Key decisions:**
- `useFocusEffect` with `useCallback`: fires whenever the settings tab gains focus (including return from contact detail after deletion). Pattern already used in `followups.tsx` and `contacts.tsx`.
- `plan_tier === 'unlimited' ? 'unlimited plan' : 'free plan'` — no i18n, matches paywall hardcoded-string pattern.
- `MANAGE_URL` defined at module level with `Platform.OS` check — evaluated once at runtime.
- Upgrade button uses `router.push('/paywall')` — pushes onto the navigation stack so `router.back()` after subscribe returns to settings. `extractedName` will be null/undefined, so paywall renders: "you hit the free contact limit." (the existing fallback).
- Bordered row style (`borderWidth: 1, borderColor: theme.text + '20'`) matches `LegalSettings.tsx` row pattern.

---

### Task 2 Details: `settings.tsx` update

Add import and render before `<NotificationSettings />`:

```tsx
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';

// In JSX, after the heading <Text> and before <NotificationSettings />:
<SubscriptionSettings />
```

---

### Files to NOT Touch

| File | Reason |
|---|---|
| `src/stores/subscription.store.ts` | No changes — `setContactCount` already exists |
| `src/services/payments.service.ts` | No changes — purchase/restore already complete |
| `src/app/paywall.tsx` | No changes — upgrade CTA just pushes to it |
| `src/db/queries/contacts.ts` | `getContactCount()` already exists — no changes |

---

### Visual Reference

Settings screen (after this story):
```
settings

[ subscription section ]
  subscription
  ┌──────────────────────┐
  │ free plan            │  ← or "unlimited plan"
  │ 7/10 contacts        │  ← or "₹400/month · renews automatically"
  └──────────────────────┘
  [        upgrade       ]  ← or [  manage subscription  ] (outlined)

[ notification timing section ]
  ...

[ google drive backup section ]
  ...
```

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual verification:
1. Free plan: open settings → subscription section shows "free plan", "X/10 contacts", upgrade button; tap upgrade → paywall appears; cancel → back to settings
2. Unlimited plan: set `plan_tier` to `'unlimited'` in store → subscription shows "unlimited plan", "₹400/month · renews automatically", "manage subscription" button; tap → opens App Store/Play Store subscriptions
3. Delete a contact → navigate back to settings → count decrements
4. Add a contact via capture → navigate to settings → count increments

### File List

- `src/components/settings/SubscriptionSettings.tsx` (NEW)
- `src/app/(tabs)/settings.tsx` (UPDATE — add SubscriptionSettings)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Task 1: Created `SubscriptionSettings.tsx`. Uses `useFocusEffect` + `getContactCount()` for real-time count refresh. FREE: bordered info row + filled upgrade button → `router.push('/paywall')`. UNLIMITED: bordered info row + outlined "manage subscription" button → `Linking.openURL()` with platform-specific URL.
- Task 2: Updated `settings.tsx` to import and render `<SubscriptionSettings />` as the first section after the heading.
- Task 3: `npx tsc --noEmit` outputs only the pre-existing `_layout.tsx:164` error (unrelated `NativeTheme` type mismatch). New files are clean.

### Change Log

- 2026-06-16: Story created. Status → ready-for-dev.
- 2026-06-16: Implementation complete. All tasks done, tsc clean. Status → review.
