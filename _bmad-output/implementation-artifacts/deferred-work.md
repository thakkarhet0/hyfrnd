# Deferred Work

## Deferred from: code review of 6-2-google-drive-backup (2026-06-15)

- **Expired access token triggers infinite retry loop on foreground** (`src/app/_layout.tsx`): When an access token expires and backup fails with 401, `last_backup_error` is set. On every subsequent foreground event, the layout retries with the same expired token, failing again. Refresh token flow (using `REFRESH_KEY` from SecureStore) is out of scope for Story 6-2 per dev notes. Needs a token-refresh path in a future story.

- **Stale last_backup_at / last_backup_error on re-enable** (`src/components/settings/BackupSettings.tsx`): When user disables backup, the DB values for `last_backup_at` and `last_backup_error` are not cleared. If backup is re-enabled, the old timestamps are shown until the immediate post-enable backup completes. Minor UX issue; the auto-backup on enable masks it in the happy path. Address when implementing restore or backup management.

## Deferred from: code review of 7-3-in-app-purchase-flow (2026-06-16)

- **plan_tier not persisted across cold starts** (`src/stores/subscription.store.ts`): Zustand store has no persist middleware and no DB column for subscription tier. After app kill + relaunch, `plan_tier` resets to `'free'`, locking a paying user out until they restore. Needs persistence via SecureStore or DB + on-launch IAP verification. Story 7-4/7-5 scope.
- **Server-side receipt validation absent** (`src/services/payments.service.ts`): `finishTransaction` is called client-side; `setPlanTier` is triggered on listener callback alone. A spoofed listener on a jailbroken device can unlock premium for free. Architecture marks this as Vision-phase; address before scaling.
- **DuplicatePurchase/AlreadyOwned error code not special-cased** (`src/services/payments.service.ts:54`): An existing subscriber who reinstalls and taps "start free trial" gets a raw error string Alert. Should detect `ErrorCode.AlreadyOwned`/`DuplicatePurchase` and silently set `plan_tier('unlimited')` or prompt restore flow. Story 7-4 scope.
- **initPayments() failure silently swallowed** (`src/app/paywall.tsx:88`): If `initConnection()` fails (billing unavailable, Play Store not signed in), the error is eaten and the subscribe button remains active. Downstream `requestPurchase` will fail with a cryptic message. Add `iapReady` state to gate the subscribe button.
- **handleRestore stub violates App Store Review Guideline 3.1.1** (`src/app/paywall.tsx:37`): The iOS restore button is visible but does nothing (console.log only). Apple requires a functional restore button. Must be implemented before App Store submission. Story 7-4 scope. ✅ RESOLVED in Story 7-4.

## Deferred from: code review of 7-4-subscription-restore (2026-06-16)

- **iOS swipe-back not blocked during restore** (`src/app/paywall.tsx`): `BackHandler` only fires on Android. During an active restore on iOS, a native swipe-back gesture unmounts the paywall — the restore result is lost (but capture state is preserved, no `reset()` called). Fix: add `usePreventRemove` hook or set `gestureEnabled: false` on the route while `isRestoringRef.current` is true. Out of MVP scope; address before App Store submission.
