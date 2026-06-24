# Story 6.3: Consent Management and Data Deletion

Status: done

## Story

As a user,
I want to see and change my consent settings, and delete all my data if I choose,
So that I am in complete control of my information (DPDP compliance).

## Acceptance Criteria

1. **Given** the settings tab is open, **When** the user views the consent section, **Then** the current STT consent status is displayed with a toggle to revoke or re-grant
2. **Given** the user toggles STT consent off, **Then** `consent_state.stt_consent_granted` is set to `false`; future STT calls are blocked immediately
3. **Given** the settings tab is open, **When** the user taps "delete all my data", **Then** a confirmation prompt explains: all contacts, memos, follow-ups, and voice files will be permanently deleted
4. **Given** Google Drive backup is enabled, **Then** the Drive App Data is also deleted as part of the deletion flow
5. **Given** the user confirms deletion, **Then** all local DB rows are deleted, all audio files and contact photos are removed from device storage, the SQLCipher key is rotated, and (if enabled) the Drive backup is cleared
6. **Given** deletion completes, **Then** the app resets to the onboarding flow (navigate to `/onboarding/language`, reset app store state)

## Tasks / Subtasks

- [x] Task 1: Create `deletion.service.ts` (AC: 4, 5)
  - [x] Collect all audio paths from `memos` table and photo URIs from `contacts` table before deleting rows
  - [x] If backup_enabled: get stored token and call `clearDriveBackup` (best-effort, do not block deletion on failure)
  - [x] Delete all rows: `stt_queue`, `context_points`, `follow_ups`, `memos`, `contacts` in dependency order; reset `consent_state` and `app_prefs` to defaults
  - [x] Delete audio files from device storage using `FileSystem.deleteAsync` (idempotent, ignore errors)
  - [x] Delete contact photo files (idempotent, ignore errors)
  - [x] Add `rotateEncryptionKey()` to `src/db/encryption.ts` and call it
  - [x] Return `{ error: string | null }`

- [x] Task 2: Create `ConsentSettings.tsx` component (AC: 1, 2, 3, 5, 6)
  - [x] On mount: load `stt_consent_granted` from `getSttConsentGranted()`
  - [x] Render STT consent row with toggle (same visual style as onboarding consent row)
  - [x] Toggle on change: call `upsertConsentState(newValue)`, update local state
  - [x] Render "delete all my data" Pressable
  - [x] On delete press: show `Alert.alert` confirmation with destructive action
  - [x] On confirm: set `isDeleting = true`, call `deleteAllData()`, on success reset store and navigate to `/onboarding/language`
  - [x] On error: show error text, re-enable the button

- [x] Task 3: Add `ConsentSettings` to settings screen (AC: 1)
  - [x] Import and render `<ConsentSettings />` in `src/app/(tabs)/settings.tsx` below `<BackupSettings />`

- [x] Task 4: Add i18n keys to all three locales (AC: 1, 3)

- [x] Task 5: Verify `tsc --noEmit` passes cleanly

## Dev Notes

### Overview

This story adds two things to the settings screen:
1. An STT consent toggle — lets users revoke or re-grant STT consent post-onboarding
2. A "delete all my data" flow — DPDP hard requirement; cascades to all local data AND Google Drive if backup is enabled

The component lives at `src/components/settings/ConsentSettings.tsx`. The deletion orchestration lives at `src/services/deletion.service.ts`. No new DB migration is needed — all tables already exist.

**DO NOT** implement data export, data portability, or restore. **DO NOT** touch capture or contacts screens. Scope is strictly settings.

---

### Task 1 Details: `deletion.service.ts`

**File**: `src/services/deletion.service.ts`

**Imports needed**:
```ts
import * as FileSystem from 'expo-file-system/legacy';
import { getDb } from '@/db';
import { rotateEncryptionKey } from '@/db/encryption';
import { contacts, memos, context_points, follow_ups, stt_queue, consent_state, app_prefs } from '@/db/schema';
import { getAppPrefs } from '@/db/queries/app-prefs';
import { clearDriveBackup, getStoredAccessToken, clearStoredTokens } from '@/services/backup.service';
```

**Full implementation**:
```ts
export async function deleteAllData(): Promise<{ error: string | null }> {
  try {
    const db = getDb();

    // 1. Collect file paths before deleting rows
    const allMemos = await db.select({ audio_path: memos.audio_path }).from(memos);
    const allContacts = await db.select({ photo_uri: contacts.photo_uri }).from(contacts);

    // 2. Clear Drive backup (best-effort — don't block deletion on failure)
    const { data: prefs } = await getAppPrefs();
    if (prefs?.backup_enabled) {
      const token = await getStoredAccessToken();
      if (token) {
        await clearDriveBackup(token).catch((err) =>
          console.warn('[deletion] Drive backup clear failed:', err),
        );
      }
      await clearStoredTokens();
    }

    // 3. Delete all DB rows in dependency order
    await db.delete(stt_queue);
    await db.delete(context_points);
    await db.delete(follow_ups);
    await db.delete(memos);
    await db.delete(contacts);
    await db.delete(consent_state);
    await db.delete(app_prefs);

    // 4. Delete audio files
    for (const { audio_path } of allMemos) {
      if (audio_path) {
        await FileSystem.deleteAsync(audio_path, { idempotent: true }).catch(() => null);
      }
    }

    // 5. Delete contact photo files
    for (const { photo_uri } of allContacts) {
      if (photo_uri && photo_uri.startsWith(FileSystem.documentDirectory ?? '')) {
        await FileSystem.deleteAsync(photo_uri, { idempotent: true }).catch(() => null);
      }
    }

    // 6. Rotate SQLCipher key
    await rotateEncryptionKey();

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}
```

**`rotateEncryptionKey` — add to `src/db/encryption.ts`**:

The key rotation uses SQLCipher's `PRAGMA rekey`. In op-sqlite/Drizzle, raw SQL is executed via `db.run`. The new key is generated, the PRAGMA is executed on the live connection, then SecureStore is updated.

```ts
import { sql } from 'drizzle-orm';
import { getDb } from '@/db';

export async function rotateEncryptionKey(): Promise<void> {
  const newKey = generateEncryptionKey();
  // PRAGMA rekey changes the SQLCipher key on the live connection
  await getDb().run(sql.raw(`PRAGMA rekey = '${newKey}'`));
  await SecureStore.setItemAsync(DB_KEY_STORE, newKey, KEYCHAIN_OPTIONS);
}
```

**Important**: `DB_KEY_STORE` and `KEYCHAIN_OPTIONS` are already defined in `encryption.ts` — `rotateEncryptionKey` is added to the same file so it can access them. Do NOT re-define them elsewhere. `generateEncryptionKey()` is already exported from the same file — call it directly.

**Important on `sql.raw`**: In Drizzle ORM, `sql.raw(string)` creates a raw SQL fragment without parameterization. This is intentional here because SQLCipher PRAGMA statements do not support parameterized values. The key is a hex string with no special characters, so injection is not a risk.

**Drive cleanup**: `clearDriveBackup` and `clearStoredTokens` are already exported from `src/services/backup.service.ts` — no changes needed there.

**DB delete order matters**:
- `stt_queue` references `memos` → delete first
- `context_points` references `memos` → delete second
- `follow_ups` references `contacts` and `memos` → delete third
- `memos` references `contacts` → delete fourth
- `contacts` → delete fifth
- `consent_state`, `app_prefs` → no foreign keys, delete last

**After deletion, the app will start up again and find empty tables**. The `_layout.tsx` init reads `app_prefs` → finds no row → `getAppPrefs` returns `data: null` → `onboarding_complete` stays false → store starts with default state → app routes to onboarding correctly. No special re-seeding is needed.

---

### Task 2 Details: `ConsentSettings.tsx`

**File**: `src/components/settings/ConsentSettings.tsx`

**Imports needed**:
```ts
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSttConsentGranted, upsertConsentState } from '@/db/queries/consent';
import { useAppStore } from '@/stores/app.store';
import { deleteAllData } from '@/services/deletion.service';
```

**Component**:
```tsx
export function ConsentSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const store = useAppStore();

  const [sttConsent, setSttConsent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    getSttConsentGranted().then(({ data }) => {
      setSttConsent(data);
    });
  }, []);

  const handleToggleConsent = useCallback(async (newValue: boolean) => {
    setSttConsent(newValue);
    const { error } = await upsertConsentState(newValue);
    if (error) {
      console.warn('[ConsentSettings] upsertConsentState failed:', error);
      setSttConsent(!newValue); // revert on failure
    }
  }, []);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      t('consent.deleteConfirmTitle'),
      t('consent.deleteConfirmBody'),
      [
        { text: t('consent.deleteCancel'), style: 'cancel' },
        {
          text: t('consent.deleteConfirm'),
          style: 'destructive',
          onPress: () => {
            setIsDeleting(true);
            setDeleteError(null);
            deleteAllData().then(({ error }) => {
              if (error) {
                setIsDeleting(false);
                setDeleteError(error);
                return;
              }
              // Reset Zustand store so _layout re-routes correctly
              store.setOnboardingComplete(false);
              store.setOnboardingStep('language');
              router.replace('/onboarding/language');
            });
          },
        },
      ],
    );
  }, [t, store]);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('consent.title')}</Text>

      {/* STT consent toggle */}
      <View style={[styles.consentRow, { borderColor: theme.text + '20' }]}>
        <View style={styles.consentText}>
          <Text style={[styles.label, { color: theme.text }]}>{t('consent.sttToggle')}</Text>
          <Text style={[styles.detail, { color: theme.text + '80' }]}>{t('consent.sttDetail')}</Text>
        </View>
        <Pressable
          onPress={() => void handleToggleConsent(!sttConsent)}
          style={[
            styles.toggle,
            { backgroundColor: sttConsent ? theme.cta : theme.text + '20' },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: sttConsent }}
        >
          <View
            style={[
              styles.toggleKnob,
              { backgroundColor: theme.background, transform: [{ translateX: sttConsent ? 20 : 0 }] },
            ]}
          />
        </Pressable>
      </View>

      {/* Data deletion */}
      <Text style={[styles.detail, { color: theme.text + '80' }]}>{t('consent.deleteDisclosure')}</Text>
      {deleteError ? (
        <Text style={styles.errorText}>{deleteError}</Text>
      ) : null}
      <Pressable
        onPress={handleDeletePress}
        disabled={isDeleting}
        style={({ pressed }) => [
          styles.deleteButton,
          { borderColor: '#c0392b', opacity: isDeleting || pressed ? 0.5 : 1 },
        ]}
        accessibilityRole="button"
      >
        <Text style={[styles.deleteButtonText, { color: '#c0392b' }]}>
          {isDeleting ? t('consent.deleting') : t('consent.deleteButton')}
        </Text>
      </Pressable>
    </View>
  );
}
```

**Styles** — follow the same patterns as `BackupSettings.tsx` and `NotificationSettings.tsx`:
```ts
const styles = StyleSheet.create({
  section: { gap: Spacing.lg },
  sectionTitle: { fontFamily: FONT_BOLD, fontSize: 18, textTransform: 'lowercase' },
  consentRow: { borderWidth: 1, padding: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  consentText: { flex: 1, gap: 4 },
  label: { fontFamily: FONT_BOLD, fontSize: 16, textTransform: 'lowercase' },
  detail: { fontFamily: FONT_REGULAR, fontSize: 14, lineHeight: 20, textTransform: 'lowercase' },
  toggle: { width: 44, height: 24, justifyContent: 'center', paddingHorizontal: 2 },
  toggleKnob: { width: 20, height: 20 },
  deleteButton: { paddingVertical: Spacing.lg, alignItems: 'center', borderWidth: 1 },
  deleteButtonText: { fontFamily: FONT_REGULAR, fontSize: 18, textTransform: 'lowercase' },
  errorText: { fontFamily: FONT_REGULAR, fontSize: 13, color: '#c0392b', textTransform: 'lowercase' },
});
```

**Key design decisions**:
- Toggle visual matches onboarding consent toggle exactly (same `width: 44, height: 24` pill with 20px knob)
- Delete button is an outlined red border (NOT filled) — makes it visually distinct from primary actions
- `isDeleting` disables all interaction; no separate loading spinner needed since deletion is fast
- If deletion errors, show the error string inline and re-enable the button

**`Alert.alert` on Android**: displays as a native dialog. On iOS, the `style: 'destructive'` makes the confirm text red in the native dialog. This is correct UX.

---

### Task 3 Details: Settings Screen Update

In `src/app/(tabs)/settings.tsx`:
```tsx
import { ConsentSettings } from '@/components/settings/ConsentSettings';
// inside ScrollView, after <BackupSettings />:
<ConsentSettings />
```

Current settings screen already has `SafeAreaView` from `react-native-safe-area-context` and a `ScrollView` with `gap: Spacing.xl` in `contentContainerStyle`. `ConsentSettings` fits naturally as the third section.

---

### Task 4 Details: i18n Keys

Add under `"consent"` key in all three locale files.

**`en.json`**:
```json
"consent": {
  "title": "privacy & consent",
  "sttToggle": "allow voice transcription",
  "sttDetail": "your voice is sent to sarvam ai for transcription. you can turn this off anytime.",
  "deleteTitle": "delete my data",
  "deleteDisclosure": "permanently deletes all contacts, memos, follow-ups, and voice files from this device.",
  "deleteButton": "delete all my data",
  "deleteConfirmTitle": "delete everything?",
  "deleteConfirmBody": "this will permanently delete all contacts, memos, follow-ups, and voice files. if google drive backup is enabled, that will also be deleted. this cannot be undone.",
  "deleteConfirm": "delete everything",
  "deleteCancel": "cancel",
  "deleting": "deleting..."
}
```

**`hi.json`**:
```json
"consent": {
  "title": "प्राइवेसी और सहमति",
  "sttToggle": "वॉयस ट्रांसक्रिप्शन की अनुमति दें",
  "sttDetail": "आपकी आवाज़ ट्रांसक्रिप्शन के लिए Sarvam AI को भेजी जाती है। इसे कभी भी बंद करें।",
  "deleteTitle": "मेरा डेटा हटाएं",
  "deleteDisclosure": "इस डिवाइस से सभी संपर्क, मेमो, फ़ॉलो-अप और वॉयस फ़ाइलें स्थायी रूप से हट जाएंगी।",
  "deleteButton": "सारा डेटा हटाएं",
  "deleteConfirmTitle": "सब कुछ हटाएं?",
  "deleteConfirmBody": "सभी संपर्क, मेमो, फ़ॉलो-अप और वॉयस फ़ाइलें स्थायी रूप से हट जाएंगी। अगर गूगल ड्राइव बैकअप चालू है, तो वह भी हट जाएगा। यह वापस नहीं होगा।",
  "deleteConfirm": "सब हटाएं",
  "deleteCancel": "रद्द करें",
  "deleting": "हटाया जा रहा है..."
}
```

**`gu.json`**:
```json
"consent": {
  "title": "પ્રાઇવસી અને સંમતિ",
  "sttToggle": "વૉઇસ ટ્રાન્સક્રિપ્શનની પરવાનગી આપો",
  "sttDetail": "ટ્રાન્સક્રિપ્શન માટે તમારો અવાજ Sarvam AIને મોકલાય છે. ગમે ત્યારે બંધ કરો.",
  "deleteTitle": "મારો ડેટા ડિલીટ કરો",
  "deleteDisclosure": "આ ડિવાઇસ પરના તમામ સંપર્ક, મેમો, ફૉલો-અપ અને વૉઇસ ફાઇલ કાયમ માટે ડિલીટ થઈ જશે.",
  "deleteButton": "બધો ડેટા ડિલીટ કરો",
  "deleteConfirmTitle": "બધું ડિલીટ કરવું?",
  "deleteConfirmBody": "તમામ સંપર્ક, મેમો, ફૉલો-અપ અને વૉઇસ ફાઇલ કાયમ માટે ડિલીટ થઈ જશે. ગૂગલ ડ્રાઇવ બૅકઅપ ચાલુ હોય તો તે પણ ડિલીટ થશે. આ ઉલટાવી ન શકાય.",
  "deleteConfirm": "બધું ડિલીટ કરો",
  "deleteCancel": "રદ કરો",
  "deleting": "ડિલીટ થઈ રહ્યું છે..."
}
```

---

### Critical Patterns to Preserve

**`consent.ts` already exists** at `src/db/queries/consent.ts`:
- `getSttConsentGranted()` — reads `stt_consent_granted` from `consent_state` where `id = 1`
- `upsertConsentState(sttGranted: boolean)` — updates or inserts the consent row with `consent_version: 1`
- Do NOT modify this file; import from it directly.

**STT gate enforcement**: `getSttConsentGranted()` is called by the STT service before each transcription call. Toggling off in `ConsentSettings` writes to DB immediately; next STT attempt reads false → blocked. No in-memory invalidation needed.

**FileSystem import**: always `import * as FileSystem from 'expo-file-system/legacy'` (note `/legacy`) — this is how the rest of the codebase imports it. Do NOT use the new API surface.

**Audio files location**: stored in `FileSystem.documentDirectory + 'audio/'`. Individual file paths are stored in `memos.audio_path`. Delete by iterating all `audio_path` values from the DB before deleting rows.

**Contact photo files**: stored at `${FileSystem.documentDirectory}contact-photo-${id}-${Date.now()}.jpg`. Paths are in `contacts.photo_uri`. Only delete files that start with `FileSystem.documentDirectory` (filter out external URIs from device contact picker).

**DB delete order (foreign key constraints)**:
1. `stt_queue` (FK → memos)
2. `context_points` (FK → memos)
3. `follow_ups` (FK → contacts, memos)
4. `memos` (FK → contacts)
5. `contacts`
6. `consent_state`
7. `app_prefs`

Do NOT call `db.delete(app_prefs)` and re-insert defaults — the empty table is fine. On next app start, `getAppPrefs()` returns `data: null` (no row), which causes `_layout.tsx` to leave `onboarding_complete` false, routing to onboarding. The `INSERT OR IGNORE` in m0001 does NOT re-run after initial migration.

**SQLCipher key rotation**: uses `sql.raw()` from `drizzle-orm`. This executes a raw SQL string without parameterization. This is safe here because the key is a 64-character hex string (`crypto.getRandomValues`).
```ts
import { sql } from 'drizzle-orm';
await getDb().run(sql.raw(`PRAGMA rekey = '${newKey}'`));
```
If `PRAGMA rekey` fails (e.g., op-sqlite build without SQLCipher), log a warning and continue — data is already deleted.

**Post-deletion navigation**: `router.replace('/onboarding/language')` replaces the navigation stack so the user cannot go back. Before navigating, reset Zustand:
```ts
store.setOnboardingComplete(false);
store.setOnboardingStep('language');
```
This ensures `_layout.tsx` won't re-route to re-engage screen on next foregrounding.

**Drive backup is best-effort**: call `clearDriveBackup` in a `.catch()` wrapped call. If it fails (expired token, no network), local data is still deleted. Log the failure but don't surface it to the user.

---

### Existing Code to Not Break

| File | What to preserve |
|------|-----------------|
| `src/app/(tabs)/settings.tsx` | `NotificationSettings` and `BackupSettings` imports and renders must remain |
| `src/db/queries/consent.ts` | All existing exports — only add `ConsentSettings` as a consumer |
| `src/db/encryption.ts` | `DB_KEY_STORE`, `KEYCHAIN_OPTIONS`, `generateEncryptionKey`, `getOrCreateEncryptionKey` — add `rotateEncryptionKey` only |
| `src/services/backup.service.ts` | No changes; only import `clearDriveBackup`, `getStoredAccessToken`, `clearStoredTokens` from it |
| `src/hooks/use-capture-flow.ts` | Audio directory pattern: `AUDIO_DIR = documentDirectory + 'audio/'` — deletion iterates `memos.audio_path` from DB, so this is consistent |

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual test:
1. Open settings → see "privacy & consent" section with STT toggle and "delete all my data" button
2. Toggle STT off → record a memo → confirm STT is blocked (memo stays in pending/failed state)
3. Toggle STT back on → confirm STT works again
4. Tap "delete all my data" → see confirmation dialog → tap cancel → nothing changes
5. Tap "delete all my data" → confirm → app resets to language selection screen
6. With Drive backup enabled: deletion should also clear Drive app data folder

---

### File List

- `src/services/deletion.service.ts` (NEW)
- `src/db/encryption.ts` (UPDATED — `rotateEncryptionKey` added)
- `src/components/settings/ConsentSettings.tsx` (NEW)
- `src/app/(tabs)/settings.tsx` (UPDATED — ConsentSettings added)
- `src/constants/i18n/locales/en.json` (UPDATED — consent keys)
- `src/constants/i18n/locales/hi.json` (UPDATED — consent keys)
- `src/constants/i18n/locales/gu.json` (UPDATED — consent keys)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Task 1: deletion.service.ts created. Collects file paths before row deletion, clears Drive backup best-effort, deletes all rows in FK order, deletes audio/photo files, rotates SQLCipher key. rotateEncryptionKey added to src/db/encryption.ts.
- Task 2: ConsentSettings.tsx created. STT toggle with optimistic update and revert-on-error. Delete button (outlined red) with Alert.alert confirmation, isDeleting guard, inline error display. On success: Zustand store reset + router.replace to onboarding.
- Task 3: settings.tsx updated with ConsentSettings import and render.
- Task 4: consent i18n keys added to en.json, hi.json, gu.json.
- Task 5: tsc --noEmit passes cleanly.

### Change Log

- 2026-06-15: Implementation complete. All 5 tasks done, tsc clean. Status → review.

## Senior Developer Review (AI)

**Date**: 2026-06-15
**Outcome**: Changes Requested
**High**: 2 | **Medium**: 3 | **Low**: 1

### Action Items

- [ ] [High] `src/db/encryption.ts:29` — PRAGMA rekey catch swallows error but SecureStore still updated with new key → DB permanently unreadable on next launch. Fix: move `SecureStore.setItemAsync` inside the try, or re-throw from catch so SecureStore is never written when rekey fails.
- [ ] [High] `src/services/deletion.service.ts:54` — rotateEncryptionKey throwing after data is deleted returns error to caller; ConsentSettings shows error but never navigates → user stuck with empty DB. Fix: on error from rotateEncryptionKey specifically (or any error that occurs after data is wiped), still navigate to onboarding with a warning rather than leaving the user stranded.
- [ ] [Medium] `src/components/settings/ConsentSettings.tsx:22` — STT toggle is interactive during async DB load; user can toggle from wrong initial value causing UI/DB state mismatch. Fix: disable the toggle (or add `isLoadingConsent` state) until `getSttConsentGranted()` resolves.
- [ ] [Medium] `src/services/deletion.service.ts:46` — `documentDirectory ?? ''` fallback defeats the external-URI guard when documentDirectory is null. Fix: skip the photo deletion loop entirely when `FileSystem.documentDirectory` is null.
- [ ] [Medium] `src/services/deletion.service.ts:19` — `clearStoredTokens()` only called inside `backup_enabled` guard; stale tokens survive full deletion in edge-case failure scenarios. Fix: call `clearStoredTokens()` unconditionally (it is idempotent).
- [ ] [Low] `src/components/settings/ConsentSettings.tsx:48` — `isDeleting` never reset to false on success path; if `router.replace()` fails the button is permanently stuck. Fix: call `setIsDeleting(false)` before `router.replace()`, and add `.catch()` to the `.then()` to handle navigation errors.

### Review Follow-ups (AI)

- [x] [AI-Review] [High] Fix encryption.ts rotateEncryptionKey: don't update SecureStore when PRAGMA rekey fails
- [x] [AI-Review] [High] Fix deletion.service.ts: navigate to onboarding even when rotateEncryptionKey throws (post-wipe)
- [x] [AI-Review] [Medium] Fix ConsentSettings.tsx: disable STT toggle during async consent load
- [x] [AI-Review] [Medium] Fix deletion.service.ts: guard photo loop against null documentDirectory
- [x] [AI-Review] [Medium] Fix deletion.service.ts: call clearStoredTokens() unconditionally
- [x] [AI-Review] [Low] Fix ConsentSettings.tsx: reset isDeleting + add .catch() on success path
