# Story 7.4: Subscription Restore

Status: done

## Story

As a user,
I want to restore my subscription on a new device or after reinstalling,
So that I don't lose my paid access.

## Acceptance Criteria

1. **Given** the user previously purchased a subscription, **When** they tap "restore purchase" on the paywall (iOS only), **Then** the platform's restore flow is triggered (FR52) and `plan_tier` is set to `'unlimited'` if a valid prior purchase is found
2. **Given** the restore flow is in progress, **Then** the "restore purchase" button shows a loading indicator and all paywall buttons are non-interactive
3. **Given** no prior purchase is found after restore completes, **Then** `Alert.alert('', 'no previous purchase found')` is shown and the user remains on the paywall
4. **Given** a restore error occurs (network, billing service), **Then** `Alert.alert('', errorMessage)` is shown and the user remains on the paywall — draft capture is still preserved (no `reset()` called)
5. **Given** restore succeeds, **Then** `subscriptionStore.setPlanTier('unlimited')` is called and `router.back()` returns the user to the contact-linking screen with state preserved (same pattern as successful purchase in Story 7-3)
6. **Given** Android, **Then** no restore button is shown — Play Store handles restore automatically (iOS-only per platform rules)

## Tasks / Subtasks

- [x] Task 1: Add `restoreSubscription()` to `src/services/payments.service.ts` (AC: 1, 3, 4, 5)
  - [x] Import `restorePurchases`, `getAvailablePurchases` from `react-native-iap`
  - [x] Export `RestoreResult = { found: true } | { found: false; error?: string }`
  - [x] Export `restoreSubscription(): Promise<RestoreResult>` — calls `restorePurchases()` then `getAvailablePurchases()`, checks for PRODUCT_ID match
  - [x] On match: call `finishTransaction` for each matching purchase, return `{ found: true }`
  - [x] On no match: return `{ found: false }`
  - [x] On throw: return `{ found: false; error: err.message }`

- [x] Task 2: Update `src/app/paywall.tsx` to wire real restore (AC: 1, 2, 3, 4, 5, 6)
  - [x] Import `restoreSubscription` from `@/services/payments.service`
  - [x] Add `isRestoring` state (`useState<boolean>(false)`)
  - [x] Add `isRestoringRef` (separate ref, mirrors `isPurchasingRef` pattern from Story 7-3)
  - [x] Replace `handleRestore` stub with real async handler
  - [x] `handleRestore`: set `isRestoringBoth(true)` → call `restoreSubscription()` → set `isRestoringBoth(false)` → handle result
  - [x] On `found: true`: `setPlanTier('unlimited')` → `router.back()`
  - [x] On `found: false` with no error: `Alert.alert('', 'no previous purchase found')`
  - [x] On `found: false` with error: `Alert.alert('', result.error)`
  - [x] Disable ALL Pressables when `isRestoring` (combined `disabled={isPurchasing || isRestoring}`)
  - [x] Show `ActivityIndicator` inside the restore button when `isRestoring`
  - [x] `onPress={() => void handleRestore()}` to suppress unhandled-promise warning

- [x] Task 3: Verify `npx tsc --noEmit` passes cleanly

## Dev Notes

### Overview

Story 7-3 implemented the purchase flow and left `handleRestore` as a `console.log` stub. This story replaces that stub with a real restore flow using `restorePurchases()` + `getAvailablePurchases()` from `react-native-iap`.

**iOS-only**: The "restore purchase" button is already conditionally rendered `{Platform.OS === 'ios' && ...}` in paywall.tsx. Android's Play Store restores subscriptions automatically on sign-in — no explicit restore button needed.

**The restore flow:**
1. `restorePurchases()` — triggers StoreKit to re-deliver any previously purchased items via the platform. Returns `Promise<void>` when the restore *request* has been dispatched (not when all items are delivered).
2. `getAvailablePurchases()` — queries the store for currently-held non-consumables and active subscriptions. Called *after* `restorePurchases()` resolves to get the full list.
3. Check if any returned `Purchase` has `productId === PRODUCT_ID` (`'godsplan_unlimited_monthly'`).
4. If found → `finishTransaction` any unfinished ones + return `{ found: true }`.
5. If not found → return `{ found: false }`.

**No timeout needed**: `restorePurchases()` resolves when the platform restore is complete (or fails). Unlike `requestPurchase` (which is fully event-based), restore is a request-response pattern.

---

### Task 1 Details: `src/services/payments.service.ts` additions

Add to the existing imports:
```ts
import {
  // ... existing imports ...
  restorePurchases,
  getAvailablePurchases,
} from 'react-native-iap';
```

Add after `purchaseSubscription`:
```ts
export type RestoreResult =
  | { found: true }
  | { found: false; error?: string };

export async function restoreSubscription(): Promise<RestoreResult> {
  try {
    await restorePurchases();
    const purchases = await getAvailablePurchases();
    const match = purchases.find((p) => p.productId === PRODUCT_ID);
    if (match) {
      // acknowledge any unfinished transaction from the restore
      try {
        await finishTransaction({ purchase: match, isConsumable: false });
      } catch {
        // non-fatal — subscription already active in the platform
      }
      return { found: true };
    }
    return { found: false };
  } catch (err) {
    return {
      found: false,
      error: err instanceof Error ? err.message : 'restore failed',
    };
  }
}
```

**Key decisions:**
- `restorePurchases()` first, then `getAvailablePurchases()`. This ensures that any entitlements from a prior purchase session are refreshed before querying.
- `finishTransaction` called on the first matching purchase only (not all). Subscriptions have a single active transaction at a time — no need to iterate all.
- `isConsumable: false` — same as in `purchaseSubscription`.
- Error typed as `error?: string` (optional) so the caller can distinguish "no match" from "error".

---

### Task 2 Details: `src/app/paywall.tsx` changes

**Current state of paywall.tsx (after Story 7-3 patches):**
- `isPurchasingRef = useRef(false)` tracks purchase state for BackHandler and cleanup
- `setIsPurchasingBoth(val)` syncs both ref and state
- `handleRestore` is a stub with `console.log`

**Changes needed:**

1. Add `isRestoring` state and ref (mirrors `isPurchasing`/`isPurchasingRef` pattern):
```tsx
const [isRestoring, setIsRestoring] = useState(false);
const isRestoringRef = useRef(false);

const setIsRestoringBoth = (val: boolean) => {
  isRestoringRef.current = val;
  setIsRestoring(val);
};
```

2. Update `BackHandler` guard to also block during restore:
```tsx
useEffect(() => {
  const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (isPurchasingRef.current || isRestoringRef.current) return true;
    handleNotNow();
    return true;
  });
  return () => backSub.remove();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

3. Update `endPayments` cleanup to also skip during restore:
```tsx
useEffect(() => {
  void initPayments().catch(() => {});
  return () => {
    if (!isPurchasingRef.current && !isRestoringRef.current) {
      void endPayments().catch(() => {});
    }
  };
}, []);
```

4. Replace `handleRestore` stub:
```tsx
const handleRestore = async () => {
  setIsRestoringBoth(true);
  const result = await restoreSubscription();
  setIsRestoringBoth(false);

  if (result.found) {
    setPlanTier('unlimited');
    router.back();
  } else if (result.error) {
    Alert.alert('', result.error);
  } else {
    Alert.alert('', 'no previous purchase found');
  }
};
```

5. Update all Pressable `disabled` props:
```tsx
disabled={isPurchasing || isRestoring}
```

6. Update restore button to show loading state:
```tsx
{Platform.OS === 'ios' && (
  <Pressable
    style={[styles.secondaryBtn, { borderColor: theme.cta }]}
    onPress={() => void handleRestore()}
    disabled={isPurchasing || isRestoring}
    accessibilityRole="button"
    accessibilityLabel="restore previous purchase"
  >
    {isRestoring ? (
      <ActivityIndicator color={theme.cta} />
    ) : (
      <Text style={[styles.secondaryLabel, { color: theme.cta }]}>
        restore purchase
      </Text>
    )}
  </Pressable>
)}
```

---

### Full Updated `src/app/paywall.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCaptureStore } from '@/stores/capture.store';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { initPayments, endPayments, purchaseSubscription, restoreSubscription } from '@/services/payments.service';

export default function PaywallScreen() {
  const theme = useTheme();
  const { extractedName, reset } = useCaptureStore();
  const { setPlanTier } = useSubscriptionStore();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const isPurchasingRef = useRef(false);
  const isRestoringRef = useRef(false);

  const setIsPurchasingBoth = (val: boolean) => {
    isPurchasingRef.current = val;
    setIsPurchasing(val);
  };

  const setIsRestoringBoth = (val: boolean) => {
    isRestoringRef.current = val;
    setIsRestoring(val);
  };

  const handleNotNow = () => {
    router.replace('/(tabs)/contacts');
    reset();
  };

  const handleSubscribe = async () => {
    setIsPurchasingBoth(true);
    const result = await purchaseSubscription();
    setIsPurchasingBoth(false);

    if (result.success) {
      setPlanTier('unlimited');
      router.back();
    } else if (result.error) {
      Alert.alert('', result.error);
    }
    // empty error = user cancelled silently — do nothing
  };

  const handleRestore = async () => {
    setIsRestoringBoth(true);
    const result = await restoreSubscription();
    setIsRestoringBoth(false);

    if (result.found) {
      setPlanTier('unlimited');
      router.back();
    } else if (result.error) {
      Alert.alert('', result.error);
    } else {
      Alert.alert('', 'no previous purchase found');
    }
  };

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isPurchasingRef.current || isRestoringRef.current) return true;
      handleNotNow();
      return true;
    });
    return () => backSub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void initPayments().catch(() => {
      // IAP unavailable on simulator or unconfigured billing — silently ignore
    });
    return () => {
      if (!isPurchasingRef.current && !isRestoringRef.current) {
        void endPayments().catch(() => {});
      }
    };
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
          onPress={() => void handleSubscribe()}
          disabled={isPurchasing || isRestoring}
          accessibilityRole="button"
          accessibilityLabel="subscribe for ₹400 per month with 7-day free trial"
        >
          {isPurchasing ? (
            <ActivityIndicator color={theme.background} />
          ) : (
            <Text style={[styles.primaryLabel, { color: theme.background }]}>
              start free trial
            </Text>
          )}
        </Pressable>

        {Platform.OS === 'ios' && (
          <Pressable
            style={[styles.secondaryBtn, { borderColor: theme.cta }]}
            onPress={() => void handleRestore()}
            disabled={isPurchasing || isRestoring}
            accessibilityRole="button"
            accessibilityLabel="restore previous purchase"
          >
            {isRestoring ? (
              <ActivityIndicator color={theme.cta} />
            ) : (
              <Text style={[styles.secondaryLabel, { color: theme.cta }]}>
                restore purchase
              </Text>
            )}
          </Pressable>
        )}

        <Pressable
          style={styles.ghostBtn}
          onPress={handleNotNow}
          disabled={isPurchasing || isRestoring}
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

---

### Critical Patterns From Story 7-3 to Preserve

**Ref pattern for BackHandler and cleanup**: Story 7-3 introduced `isPurchasingRef` to track state in stale closures. Story 7-4 adds `isRestoringRef` with the same pattern. Both refs must be checked in:
- The BackHandler callback
- The `endPayments()` cleanup return

**Navigation on success**: `router.back()` (not `router.replace`) — same as purchase. Returns to contact-linking with `newName` intact. The gate passes because `plan_tier === 'unlimited'`.

**No `reset()` on restore**: Only `handleNotNow` calls `reset()`. If restore fails or finds nothing, the capture state is preserved exactly as after a failed purchase.

**`onPress={() => void handleRestore()}`**: Same pattern as `handleSubscribe` — suppresses the unhandled-promise TypeScript warning.

**`disabled={isPurchasing || isRestoring}`**: ALL three buttons must be disabled when either operation is in progress. A user mid-restore must not be able to start a purchase (and vice versa).

---

### API Specifics (react-native-iap installed version)

Verified API from `node_modules/react-native-iap/lib/typescript/src/index.d.ts`:

```ts
export declare const restorePurchases: MutationField<'restorePurchases'>;
// restorePurchases: Promise<void> — no args

export declare const getAvailablePurchases: QueryField<'getAvailablePurchases'>;
// getAvailablePurchases(options?: PurchaseOptions): Promise<Purchase[]>
```

`Purchase` has `productId: string` field. Check `p.productId === PRODUCT_ID` (`'godsplan_unlimited_monthly'`).

**`restorePurchases()` behavior:**
- iOS: triggers StoreKit receipt refresh. Purchases previously made by the signed-in Apple ID are re-delivered (potentially via `purchaseUpdatedListener` as well).
- After `restorePurchases()` resolves, `getAvailablePurchases()` will return all currently-owned non-consumables and active subscriptions.
- The combination of `restorePurchases()` + `getAvailablePurchases()` is the standard pattern (per the library docs example).

---

### Files to NOT Touch

| File | Reason |
|---|---|
| `src/stores/subscription.store.ts` | `setPlanTier` already exists — no changes |
| `src/app/contact-linking.tsx` | No changes — gate logic unchanged |
| `src/db/` | No schema changes needed |
| `app.config.ts` | `react-native-iap` plugin already added in Story 7-3 |

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual verification (requires iOS real device with sandbox account):
1. On a device with a prior sandbox purchase: open paywall → tap "restore purchase" → loading shown → alert dismissed → returns to contact-linking with `plan_tier = 'unlimited'`
2. On a device with NO prior purchase: open paywall → tap "restore purchase" → alert "no previous purchase found"
3. Mid-restore: verify "start free trial" and "not now" are both disabled
4. Restore error (airplane mode): alert shows error message, capture state preserved

### File List

- `src/services/payments.service.ts` (UPDATE — add `restoreSubscription`)
- `src/app/paywall.tsx` (UPDATE — wire real restore, add `isRestoring` state)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Task 1: Added `restoreSubscription()` and `RestoreResult` type to payments.service.ts. Added `restorePurchases` and `getAvailablePurchases` imports. Pattern: restorePurchases() then getAvailablePurchases(), find by productId, finishTransaction on match.
- Task 2: Rewrote paywall.tsx. Added `isRestoring` state + `isRestoringRef`. Added `setIsRestoringBoth` helper. Replaced console.log stub with real async `handleRestore`. BackHandler and endPayments cleanup now check both refs. All Pressables disabled when either isPurchasing OR isRestoring. Restore button shows ActivityIndicator when isRestoring. onPress uses void pattern.
- Task 3: `npx tsc --noEmit` clean on all new/modified files. Pre-existing _layout.tsx:164 error unrelated.

### Change Log

- 2026-06-16: Story created. Status → ready-for-dev.
- 2026-06-16: Implementation complete. All tasks done, tsc clean. Status → review.
