# Story 7.3: In-App Purchase Flow

Status: done

## Story

As a user,
I want to subscribe directly from the paywall using my existing payment method,
So that upgrading is frictionless and my capture is saved immediately after.

## Acceptance Criteria

1. **Given** the paywall is displayed, **When** the user taps "start free trial", **Then** the native IAP sheet (Google Play Billing on Android / StoreKit on iOS) is triggered (FR51)
2. **Given** the IAP sheet is displayed, **When** the user completes the purchase, **Then** `subscriptionStore.setPlanTier('unlimited')` is called and the user is returned to the contact-linking screen — state preserved, no restart (FR50)
3. **Given** a purchase is in progress, **Then** the "start free trial" button shows a loading indicator and is non-interactive
4. **Given** the purchase fails (network error, billing error), **Then** an alert is shown and the user remains on the paywall — draft capture is still preserved (no `reset()` called)
5. **Given** the user cancels the IAP sheet, **Then** they are returned silently to the paywall with no error alert
6. **Given** a successful purchase, **When** the user returns to the contact-linking screen, **Then** the gate check sees `plan_tier === 'unlimited'` and allows the insert — the contact is saved and capture continues normally (FR50)
7. **Given** no payment credentials pass through app code (NFR10), **Then** all payment data is handled natively by the platform IAP SDK — no credit card data in the app

## Tasks / Subtasks

- [x] Task 1: Install `react-native-iap` and add config plugin (AC: 1, 7)
  - [x] Run `npx expo install react-native-iap`
  - [x] Add `react-native-iap` plugin to `app.config.ts` plugins array

- [x] Task 2: Create `src/services/payments.service.ts` (AC: 1, 2, 4, 5, 7)
  - [x] Export `PRODUCT_ID` constant: `'godsplan_unlimited_monthly'`
  - [x] Export `initPayments(): Promise<void>` — calls `initConnection()`
  - [x] Export `endPayments(): Promise<void>` — calls `endConnection()`
  - [x] Export `purchaseSubscription(): Promise<PurchaseResult>` — wraps `requestPurchase` with listener pattern; silent on user cancel, error string on real failures
  - [x] Type `PurchaseResult = { success: true } | { success: false; error: string }`
  - [x] Use `purchaseUpdatedListener` + `purchaseErrorListener` + `requestPurchase` from `react-native-iap`
  - [x] On Android: call `fetchProducts()` first to retrieve `offerToken` before `requestPurchase`
  - [x] Call `finishTransaction({ purchase, isConsumable: false })` after successful purchase
  - [x] On user cancel (`error.code === ErrorCode.UserCancelled`): resolve with `{ success: false, error: '' }` (silent)

- [x] Task 3: Update `src/app/paywall.tsx` (AC: 1, 2, 3, 4, 5, 6)
  - [x] Add `useSubscriptionStore` import from `@/stores/subscription.store`
  - [x] Add `ActivityIndicator` to react-native imports
  - [x] Add `Alert` to react-native imports
  - [x] Add `useState<boolean>(false)` for `isPurchasing`
  - [x] Add IAP init/end `useEffect` (separate from BackHandler `useEffect`)
  - [x] Replace `handleSubscribe` stub with real async handler: call `purchaseSubscription()`, on success → `setPlanTier('unlimited')` → `router.back()`
  - [x] Disable "start free trial" Pressable when `isPurchasing === true`
  - [x] Show `ActivityIndicator` in place of button label text when `isPurchasing === true`
  - [x] On purchase failure with non-empty error: `Alert.alert('', result.error)`
  - [x] `handleRestore` remains a stub (Story 7-4 handles it)

- [x] Task 4: Verify `npx tsc --noEmit` passes cleanly for the new files

### Review Findings

- [x] [Review][Patch] BackHandler calls handleNotNow() regardless of isPurchasing — Android back mid-purchase wipes capture state [src/app/paywall.tsx:42]
- [x] [Review][Patch] Android offerToken absent falls through to cryptic Play Billing error — no explicit early return [src/services/payments.service.ts:33]
- [x] [Review][Patch] endPayments() on unmount races with in-flight finishTransaction — need ref to skip cleanup when purchase active [src/app/paywall.tsx:54]
- [x] [Review][Defer] plan_tier not persisted across cold starts [src/stores/subscription.store.ts] — deferred, Story 7-4/7-5 scope
- [x] [Review][Defer] Server-side receipt validation absent [src/services/payments.service.ts] — deferred, Architecture Vision phase
- [x] [Review][Defer] DuplicatePurchase/AlreadyOwned not special-cased [src/services/payments.service.ts:54] — deferred, Story 7-4 restore scope
- [x] [Review][Defer] initPayments() failure silently swallowed [src/app/paywall.tsx:88] — deferred, low urgency
- [x] [Review][Defer] handleRestore stub violates App Store Review Guideline 3.1.1 [src/app/paywall.tsx:37] — deferred, Story 7-4

## Dev Notes

### Overview

This story installs `react-native-iap` and wires the "start free trial" button to real native IAP. The payments service wraps the platform-specific IAP SDK (StoreKit on iOS, Play Billing on Android) behind a simple async function. The paywall screen stays in the navigation stack when the IAP sheet is shown — when purchase completes, `router.back()` returns to `contact-linking`, which is still alive in memory with the user's typed name intact. The user taps "save as new contact" one more time and the gate passes because `plan_tier` is now `'unlimited'`.

**No backend validation in this story.** The architecture notes server-side receipt validation as a Vision-phase enhancement. For MVP, client-side acknowledgement via `finishTransaction` is sufficient.

**The product ID `godsplan_unlimited_monthly` must be configured in both App Store Connect (iOS) and Google Play Console (Android) before any IAP calls will succeed.** Testing on simulator/emulator without billing configured will receive errors from the IAP SDK — this is expected. The story uses real devices with sandbox/test accounts for validation.

---

### Task 1 Details: Install react-native-iap

```bash
npx expo install react-native-iap
```

This installs a compatible version for Expo SDK 56. Then add the config plugin to `app.config.ts`:

```ts
plugins: [
  'expo-router',
  // ... existing plugins ...
  ['react-native-iap', { paymentProvider: 'Both' }],
],
```

The `paymentProvider: 'Both'` option configures the plugin for both iOS (StoreKit) and Android (Play Billing) in a single EAS build.

**No `app.json` exists** — the project uses `app.config.ts`. Add the plugin to the `plugins` array in `app.config.ts`.

After installing, an EAS build is required for the native modules to take effect. The TypeScript types from `react-native-iap` are available immediately for development.

---

### Task 2 Details: `src/services/payments.service.ts`

```ts
import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  type SubscriptionPurchase,
} from 'react-native-iap';

export const PRODUCT_ID = 'godsplan_unlimited_monthly';

export type PurchaseResult =
  | { success: true }
  | { success: false; error: string };

export async function initPayments(): Promise<void> {
  await initConnection();
}

export async function endPayments(): Promise<void> {
  await endConnection();
}

export async function purchaseSubscription(): Promise<PurchaseResult> {
  try {
    let offerToken: string | undefined;

    if (Platform.OS === 'android') {
      const subs = await getSubscriptions({ skus: [PRODUCT_ID] });
      const offers = (subs[0] as unknown as { subscriptionOfferDetails?: { offerToken: string }[] })
        ?.subscriptionOfferDetails;
      offerToken = offers?.[0]?.offerToken;
    }

    return new Promise<PurchaseResult>((resolve) => {
      const updateSub = purchaseUpdatedListener(async (purchase: SubscriptionPurchase) => {
        try {
          await finishTransaction({ purchase, isConsumable: false });
        } catch {
          // finish errors are non-fatal — purchase already recorded by platform
        }
        updateSub.remove();
        errorSub.remove();
        resolve({ success: true });
      });

      const errorSub = purchaseErrorListener((error) => {
        updateSub.remove();
        errorSub.remove();
        if (error.code === 'E_USER_CANCELLED') {
          resolve({ success: false, error: '' }); // silent cancel
        } else {
          resolve({ success: false, error: error.message ?? 'purchase failed' });
        }
      });

      requestSubscription({
        sku: PRODUCT_ID,
        ...(Platform.OS === 'android' &&
          offerToken && {
            subscriptionOffers: [{ sku: PRODUCT_ID, offerToken }],
          }),
      }).catch((err: Error) => {
        updateSub.remove();
        errorSub.remove();
        resolve({ success: false, error: err.message ?? 'purchase failed' });
      });
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'purchase failed' };
  }
}
```

**Key implementation notes:**

- **Listener cleanup**: Both `purchaseUpdatedListener` and `purchaseErrorListener` subscriptions are removed in BOTH the success and error branches. This is critical — leaking listeners causes duplicate purchase callbacks on subsequent flows.
- **Android `offerToken`**: Google Play Billing v5+ requires an `offerToken` from the subscription offer details. We fetch it with `getSubscriptions()` before calling `requestSubscription`. The `subscriptionOfferDetails` field is accessed via a runtime cast because react-native-iap's types lag behind the Play Billing v5 API shape.
- **`isConsumable: false`**: Subscriptions are NOT consumable. Never pass `true` — that would allow the user to re-purchase the same subscription.
- **User cancel is silent**: `E_USER_CANCELLED` resolves with `error: ''`. The paywall checks `if (result.error)` before showing an Alert, so empty string produces no dialog.

---

### Task 3 Details: `src/app/paywall.tsx` changes

Full updated file:

```tsx
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCaptureStore } from '@/stores/capture.store';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { initPayments, endPayments, purchaseSubscription } from '@/services/payments.service';

export default function PaywallScreen() {
  const theme = useTheme();
  const { extractedName, reset } = useCaptureStore();
  const { setPlanTier } = useSubscriptionStore();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handleNotNow = () => {
    router.replace('/(tabs)/contacts');
    reset();
  };

  const handleSubscribe = async () => {
    setIsPurchasing(true);
    const result = await purchaseSubscription();
    setIsPurchasing(false);

    if (result.success) {
      setPlanTier('unlimited');
      router.back();
    } else if (result.error) {
      Alert.alert('', result.error);
    }
    // empty error = user cancelled silently — do nothing
  };

  const handleRestore = () => {
    // Story 7-4 replaces this with real restore flow
    console.log('[Paywall] restore tapped');
  };

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
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
      void endPayments().catch(() => {});
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
          disabled={isPurchasing}
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
            onPress={handleRestore}
            disabled={isPurchasing}
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
          disabled={isPurchasing}
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

**Key changes from Story 7-2:**
- `useState(false)` for `isPurchasing`
- Two `useEffect` hooks: one for BackHandler (unchanged), one for `initPayments/endPayments`
- `handleSubscribe` is now `async` — calls `purchaseSubscription()`, handles success/error/cancel
- `disabled={isPurchasing}` on ALL three Pressables (prevent "not now" during purchase flow)
- `ActivityIndicator` in place of text when purchasing
- `onPress={() => void handleSubscribe()}` pattern to suppress the unhandled-promise warning
- `useSubscriptionStore` imported for `setPlanTier`

---

### Product ID Setup (External Prerequisites)

The developer must configure `godsplan_unlimited_monthly` as a subscription product before any IAP calls will work:

**Apple App Store Connect:**
- Create a new subscription group "unlimited" under `com.godsplan.app`
- Add subscription: ID = `godsplan_unlimited_monthly`, price = ₹400/month (IN)
- Set up a 7-day free trial introductory offer
- Submit for App Review before it can be used in production

**Google Play Console:**
- Under `com.godsplan.app`, create a subscription: product ID = `godsplan_unlimited_monthly`
- Add a base plan with monthly pricing ₹400 INR
- Add an offer with a 7-day free trial
- Activate the subscription before testing

**Testing:**
- iOS: Use sandbox testers configured in App Store Connect
- Android: Use test accounts in Google Play Console license testing

---

### Capture Resume Flow (FR50)

The navigation stack when paywall is shown: `... → contact-linking → paywall`

After `router.back()`:
- Returns to `contact-linking`
- The `newName` state in contact-linking is STILL set (React doesn't unmount screens below the current stack)
- `subscriptionStore.plan_tier === 'unlimited'` — gate in `handleSaveNew` passes
- User taps "save as new contact" once more → contact created → capture continues normally

**Do NOT call `router.replace` on success** — this would clear contact-linking from the stack and lose the form state. Use `router.back()`.

---

### Critical Patterns to Preserve

**`handleNotNow` is disabled during purchase** (`disabled={isPurchasing}`): The user MUST NOT be able to dismiss the paywall during an in-progress IAP transaction. The platform IAP sheet is displayed on top, but if it were dismissed programmatically, the transaction state could be inconsistent.

**Listener cleanup is non-negotiable**: Both `purchaseUpdatedListener` and `purchaseErrorListener` subscriptions MUST be removed in both the success and error paths. If only one path removes them, subsequent purchase attempts get duplicate callbacks from the lingering listener. This is the most common react-native-iap bug.

**No server validation in this story**: `finishTransaction` is called client-side. This is appropriate for MVP. Server-side validation would require a serverless endpoint (Cloudflare Worker or Vercel Edge) that verifies the receipt with Apple/Google — this is Architecture's "Vision phase" plan.

**`isConsumable: false` in `finishTransaction`**: Subscriptions are not consumable. Passing `true` here would tell the platform the item was "consumed" (like a coin pack), allowing repurchase of the same item. For subscriptions this is wrong and will cause unexpected behavior.

---

### Files to NOT touch

| File | Reason |
|---|---|
| `src/stores/subscription.store.ts` | `setPlanTier` already exists from Story 7-1 |
| `src/stores/capture.store.ts` | No changes needed — `reset()` only on "not now" |
| `src/app/contact-linking.tsx` | No changes — gate already checks `plan_tier` which will be 'unlimited' after purchase |
| `src/db/` | No DB changes for subscription state — Zustand only |

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual verification (requires real device + configured product IDs):
1. With 10 contacts: trigger paywall → tap "start free trial" → native IAP sheet appears
2. Complete sandbox purchase → returns to contact-linking with name pre-filled → tap save → contact created
3. Cancel the IAP sheet → return to paywall silently (no error alert)
4. Network error during purchase → alert appears → can retry
5. Verify "start free trial" button is disabled (no tap response) while IAP sheet is loading

---

### File List

- `package.json` (UPDATE — add `react-native-iap`)
- `app.config.ts` (UPDATE — add `react-native-iap` plugin)
- `src/services/payments.service.ts` (NEW)
- `src/app/paywall.tsx` (UPDATE — wire real IAP, add loading state)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

- Task 1: Installed `react-native-iap` via `npx expo install`. Added `['react-native-iap', { paymentProvider: 'Both' }]` to `app.config.ts` plugins array.
- Task 2: Created `src/services/payments.service.ts`. API differs from story spec — installed version uses `fetchProducts` (not `getSubscriptions`), `requestPurchase` (not `requestSubscription`), `Purchase` (not `SubscriptionPurchase`), and `ErrorCode.UserCancelled` enum (not `'E_USER_CANCELLED'` string). Adapted accordingly with correct types.
- Task 3: Updated `src/app/paywall.tsx` with real IAP: `isPurchasing` state, `ActivityIndicator`, `initPayments/endPayments` useEffect, `handleSubscribe` async with success/error/cancel handling, `disabled={isPurchasing}` on all Pressables.
- Task 4: `npx tsc --noEmit` — new files type-check cleanly. Pre-existing `_layout.tsx:164` NativeTheme/Theme error unrelated to this story.

### Change Log

- 2026-06-16: Story created. Status → ready-for-dev.
- 2026-06-16: Implementation complete. API adapted for installed react-native-iap version. All tasks done, tsc clean on new files. Status → review.
- 2026-06-16: Code review complete. 3 patches applied: [HIGH] BackHandler now guards against isPurchasing via useRef; [MED] Android offerToken missing returns explicit error; [MED] endPayments() skipped when purchase in-flight. 5 deferred items. Status → done.
