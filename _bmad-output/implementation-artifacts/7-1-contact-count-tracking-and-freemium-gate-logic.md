# Story 7.1: Contact Count Tracking and Freemium Gate Logic

Status: done

## Story

As a user (free plan),
I want the app to track my contact count and stop me cleanly at the limit,
So that the freemium constraint is enforced consistently across all flows.

## Acceptance Criteria

1. **Given** the user is on the free plan, **When** they are about to create a new contact (contact linking step — Story 2.8), **Then** the system checks `SELECT COUNT(*) FROM contacts` before writing (FR25)
2. **Given** the contact count is < 10, **Then** the new contact is created normally
3. **Given** the contact count is = 10 (this would be the 11th), **Then** the paywall is triggered (FR48) — audio and extraction are already complete and safe on disk (FR49, Critical Invariant 3)
4. **Given** the paywall is triggered, **When** the user dismisses without upgrading, **Then** the current capture is preserved (audio on disk, memo row in DB) — they return to the contacts tab
5. **Given** `useSubscriptionStore`, **Then** it exposes `plan_tier` ('free' | 'unlimited'), `contact_count`, and their setters so the gate check is synchronous after initial load

## Tasks / Subtasks

- [x] Task 1: Create `src/stores/subscription.store.ts` (AC: 5)
  - [x] Define `plan_tier: 'free' | 'unlimited'` with `setPlanTier` setter
  - [x] Define `contact_count: number` with `setContactCount` setter
  - [x] Export `useSubscriptionStore`

- [x] Task 2: Add `getContactCount()` to `src/db/queries/contacts.ts` (AC: 1)
  - [x] `SELECT COUNT(*) FROM contacts` via Drizzle, returning `{ data: number; error: Error | null }`

- [x] Task 3: Update `src/app/contact-linking.tsx` to enforce the gate (AC: 1, 2, 3, 4)
  - [x] Import `useSubscriptionStore` and `getContactCount`
  - [x] In mount `useEffect`, call `getContactCount()` in parallel with `findContactsByName()` and call `store.setContactCount(count)` with the result
  - [x] In `handleSaveNew()`, before calling `insertContact`, check: if `plan_tier === 'free' && contact_count >= 10` → `router.push('/paywall')` and return
  - [x] After successful `insertContact`, call `store.setContactCount(contact_count + 1)`

- [x] Task 4: Create `src/app/paywall.tsx` stub (AC: 3 — gate navigation target must exist for tsc)
  - [x] Minimal placeholder screen so Expo Router typed routes resolve; Story 7-2 replaces this

- [x] Task 5: Verify `npx tsc --noEmit` passes cleanly

## Dev Notes

### Overview

This story wires the freemium gate into the existing contact-linking flow. The gate fires **only** when a NEW contact is about to be created — linking to an EXISTING contact is always free. The check uses a live COUNT query (loaded during the existing `searching` loading phase) so no extra loading state is needed.

**Critical Invariant 3 (must not break):** The paywall fires AFTER audio is saved to disk and STT/extraction are complete. The capture flow already guarantees this — audio is written in step 1 and extraction runs in steps 3-4 before contact-linking (step 6) is ever reached. Do NOT move the gate earlier.

**No new DB migration needed.** Subscription state lives in Zustand, not SQLite. The `app_prefs` table is not touched. IAP integration (that populates `plan_tier`) comes in Story 7-3.

---

### Task 1 Details: `src/stores/subscription.store.ts`

Follow the exact pattern of `src/stores/app.store.ts` and `src/stores/capture.store.ts`:

```ts
import { create } from 'zustand';

interface SubscriptionState {
  plan_tier: 'free' | 'unlimited';
  contact_count: number;
  setPlanTier: (tier: 'free' | 'unlimited') => void;
  setContactCount: (count: number) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plan_tier: 'free',
  contact_count: 0,
  setPlanTier: (plan_tier) => set({ plan_tier }),
  setContactCount: (contact_count) => set({ contact_count }),
}));
```

`plan_tier` defaults to `'free'` — IAP (Story 7-3) will call `setPlanTier('unlimited')` after a successful purchase. `contact_count` defaults to 0 and is hydrated from DB in ContactLinkingScreen.

---

### Task 2 Details: `getContactCount()` in `src/db/queries/contacts.ts`

Append after the existing functions. Follow the existing error handling pattern in that file (`error: Error | null`):

```ts
export async function getContactCount(): Promise<{ data: number; error: Error | null }> {
  try {
    const db = getDb();
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(contacts);
    return { data: result[0].count, error: null };
  } catch (err) {
    return { data: 0, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
```

Import `sql` from `drizzle-orm` — it is already imported via `import { eq, inArray, like, max, min, sql } from 'drizzle-orm'` at the top of that file.

---

### Task 3 Details: `src/app/contact-linking.tsx` changes

**Current file:** `/Users/hetthakkar/Desktop/Thakkarhet/gods-plan/src/app/contact-linking.tsx`

Three focused changes:

**1. Import additions (top of file):**
```ts
import { useSubscriptionStore } from '@/stores/subscription.store';
import { getContactCount } from '@/db/queries/contacts';
```

**2. Inside `ContactLinkingScreen` component — add store reference and update the mount `useEffect`:**

Current useEffect (lines 49-61):
```ts
useEffect(() => {
  if (!extractedName) {
    dispatch({ type: 'NO_MATCH', prefill: '' });
    return;
  }
  findContactsByName(extractedName)
    .then(({ data }) => {
      dispatch({ type: 'FOUND', items: data ?? [] });
    })
    .catch(() => {
      dispatch({ type: 'NO_MATCH', prefill: extractedName });
    });
}, [extractedName]);
```

Replace with — load count AND contacts in parallel during the existing `searching` loading state:
```ts
const subscriptionStore = useSubscriptionStore();

useEffect(() => {
  const contactsPromise = extractedName
    ? findContactsByName(extractedName)
    : Promise.resolve({ data: [] as { id: string; name: string }[], error: null });

  Promise.all([getContactCount(), contactsPromise]).then(([countResult, namesResult]) => {
    subscriptionStore.setContactCount(countResult.data);
    if (extractedName) {
      dispatch({ type: 'FOUND', items: namesResult.data ?? [] });
    } else {
      dispatch({ type: 'NO_MATCH', prefill: '' });
    }
  }).catch(() => {
    dispatch({ type: 'NO_MATCH', prefill: extractedName ?? '' });
  });
}, [extractedName]); // subscriptionStore is a stable Zustand reference, omit from deps
```

**3. Update `handleSaveNew` — add gate check before insert, and increment after:**

Current (lines 79-90):
```ts
const handleSaveNew = async () => {
  const trimmed = newName.trim();
  if (!trimmed) return;
  dispatch({ type: 'LINKING' });
  const { data: newId, error: insertError } = await insertContact({ name: trimmed });
  if (!newId) {
    console.warn('[ContactLinking] insertContact failed:', insertError?.message);
    dispatch({ type: 'NO_MATCH', prefill: trimmed });
    return;
  }
  await linkContact(newId, true);
};
```

Replace with:
```ts
const handleSaveNew = async () => {
  const trimmed = newName.trim();
  if (!trimmed) return;

  // Freemium gate: free plan limited to 10 contacts
  if (subscriptionStore.plan_tier === 'free' && subscriptionStore.contact_count >= 10) {
    router.push('/paywall');
    return;
  }

  dispatch({ type: 'LINKING' });
  const { data: newId, error: insertError } = await insertContact({ name: trimmed });
  if (!newId) {
    console.warn('[ContactLinking] insertContact failed:', insertError?.message);
    dispatch({ type: 'NO_MATCH', prefill: trimmed });
    return;
  }
  subscriptionStore.setContactCount(subscriptionStore.contact_count + 1);
  await linkContact(newId, true);
};
```

**What is NOT changed:**
- `linkContact()` for existing contacts — no gate, no count increment (contact already exists)
- The `Phase` state machine — no changes
- The `Action` type — no changes
- All existing rendering — no changes

---

### Task 4 Details: `src/app/paywall.tsx` stub

Story 7-2 will replace this with the real paywall. Create the minimal file now so `router.push('/paywall')` resolves in Expo Router's typed routes and `tsc` passes:

```tsx
import { Text, View } from 'react-native';

export default function PaywallScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>paywall</Text>
    </View>
  );
}
```

No styles, no theme, no i18n — this is purely a placeholder. Story 7-2 will overwrite it entirely.

---

### Critical Patterns to Preserve

**Service return pattern in contacts.ts**: `{ data: X | null; error: Error | null }` — `getContactCount` uses `data: number` (never null, defaults 0 on error) and `error: Error | null`. This matches the existing pattern in that file.

**Zustand store pattern**: `create<State>((set) => ({ ... }))` with individual setters. No `persist()` middleware — subscription state is ephemeral per session, populated from IAP on next launch (Story 7-3).

**Expo Router navigation**: `router.push('/paywall')` — do NOT use `router.replace` here. The user must be able to go back from the paywall to the contact-linking screen (or the "not now" flow in Story 7-2 will need the history stack to navigate back correctly).

**Freemium gate placement**: Gate fires in `handleSaveNew` ONLY — not in `linkContact` (existing contacts are free). Not in the initial `useEffect` (that would block users who are at the limit but just want to link to an existing contact).

**`sql` import**: Already present in `src/db/queries/contacts.ts` via `import { eq, inArray, like, max, min, sql } from 'drizzle-orm'`. Do NOT re-import.

**No `COUNT(*)` type cast issue**: Drizzle's `sql<number>` annotation tells TypeScript the type; op-sqlite returns the value as a number from SQLite. The result access pattern is `result[0].count`.

---

### Files to NOT touch

| File | Reason |
|------|--------|
| `src/db/schema.ts` | No new table needed |
| `src/db/migrations/index.ts` | No new migration — subscription state is Zustand, not SQLite |
| `src/app/_layout.tsx` | Count hydration happens in ContactLinkingScreen; no startup change needed for 7-1 |
| `src/app/(tabs)/settings.tsx` | Story 7-5 adds subscription status here |
| `src/stores/capture.store.ts` | No changes — draft preservation (FR49) is handled by the capture already being on disk; no explicit draft state needed in 7-1 |

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual verification:
1. With < 10 contacts: tap record → complete capture → reach contact linking → type new name → tap "save as new contact" → contact is created normally
2. With exactly 10 contacts: same flow → tap "save as new contact" → paywall stub screen appears
3. With < 10 contacts: reach contact linking → tap "yes" on an existing contact match → links without gate (no count check)
4. After creating an 11th contact fails (paywall), the audio/extraction data is still on disk (memo row exists in DB with status=extracted)

---

### File List

- `src/stores/subscription.store.ts` (NEW)
- `src/db/queries/contacts.ts` (UPDATE — add `getContactCount`)
- `src/app/contact-linking.tsx` (UPDATE — gate check + count hydration)
- `src/app/paywall.tsx` (NEW stub — Story 7-2 replaces)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Task 1: `useSubscriptionStore` created with `plan_tier: 'free' | 'unlimited'` (default 'free') and `contact_count: number` (default 0).
- Task 2: `getContactCount()` added to contacts.ts using `sql\`COUNT(*)\`` via Drizzle; returns `{ data: number; error: Error | null }`.
- Task 3: contact-linking.tsx updated. Mount useEffect now runs `getContactCount()` and `findContactsByName()` in parallel, populating the store. `handleSaveNew` checks the gate before `insertContact`; increments count on success.
- Task 4: `src/app/paywall.tsx` minimal stub created — Story 7-2 replaces it.
- Task 5: `npx tsc --noEmit` passes with no errors.

### Change Log

- 2026-06-15: Story created. Status → ready-for-dev.
- 2026-06-15: Implementation complete. All 5 tasks done, tsc clean. Status → review.
- 2026-06-16: Code review complete. 2 findings fixed: [HIGH] fail-open gate when count query errors now defaults to 10 instead of 0; [MEDIUM] added Number() coercion for COUNT(*) result to match file pattern. Status → done.
