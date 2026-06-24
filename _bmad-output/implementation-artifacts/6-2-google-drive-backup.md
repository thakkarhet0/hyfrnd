# Story 6.2: Google Drive Backup

Status: done

## Story

As a user,
I want to optionally back up my data to my own Google Drive,
So that I don't lose everything if I change phones.

## Acceptance Criteria

1. **Given** the settings tab is open, **When** the user views the backup section, **Then** a plain-language disclosure is shown: "your data will be saved to your Google Drive — only you can access it", with an "enable backup" button
2. **Given** the user taps "enable backup", **Then** Google OAuth is initiated via `expo-auth-session` requesting only Drive App Data scope (`https://www.googleapis.com/auth/drive.appdata`)
3. **Given** OAuth succeeds, **Then** the access token and refresh token are stored in `expo-secure-store`, `backup_enabled` is written to `app_prefs`, and a full backup runs immediately
4. **Given** backup is enabled, **Then** the backup section shows last backup time and a "backup now" button; tapping it runs a manual backup
5. **Given** the previous sync failed (e.g. no network), **Then** on next app foreground the backup retries automatically
6. **Given** the user taps "disable backup", **Then** the stored tokens are revoked via Google's revocation endpoint, the `expo-secure-store` entries are deleted, and `backup_enabled` is set to false; no further syncs occur
7. **Given** the backup file exists in Drive, **When** backup runs, **Then** it replaces the existing file (not duplicates)
8. **Given** backup succeeds, **Then** `last_backup_at` is updated and `last_backup_error` is cleared; if it fails, `last_backup_error` is set

## Tasks / Subtasks

- [ ] Task 1: DB migration — add backup columns to `app_prefs` (AC: 3, 5, 8)
  - [ ] Add migration `m0004` to `src/db/migrations/index.ts`
  - [ ] Update `src/db/schema.ts` — add `backup_enabled`, `last_backup_at`, `last_backup_error` to `app_prefs`
  - [ ] Update `src/db/queries/app-prefs.ts` — extend `AppPrefsRow`, `UpsertAppPrefsInput`, and both functions

- [ ] Task 2: Create `backup.service.ts` (AC: 2, 3, 6, 7, 8)
  - [ ] `getStoredAccessToken()` — reads from expo-secure-store key `google_drive_token`
  - [ ] `storeTokens(accessToken, refreshToken?)` — writes to expo-secure-store
  - [ ] `clearStoredTokens()` — deletes both keys from expo-secure-store
  - [ ] `revokeToken(accessToken)` — POST to Google revocation endpoint; clear from secure store
  - [ ] `runBackup(accessToken)` — serialize contacts/memos/context_points/follow_ups as JSON, upload to Drive App Data; find existing file and PATCH if present, POST create if not; update `last_backup_at` and clear `last_backup_error` in DB on success; set `last_backup_error` on failure
  - [ ] `clearDriveBackup(accessToken)` — list files in appDataFolder, delete the backup file (used by Story 6-3)

- [ ] Task 3: Create `BackupSettings.tsx` component (AC: 1, 2, 3, 4, 6)
  - [ ] Call `WebBrowser.maybeCompleteAuthSession()` at module level
  - [ ] Use `Google.useAuthRequest` with `iosClientId`, `androidClientId`, `scopes: ['https://www.googleapis.com/auth/drive.appdata']`
  - [ ] On mount: load `backup_enabled`, `last_backup_at`, `last_backup_error` from `getAppPrefs()`
  - [ ] When disabled: show disclosure text + "enable backup" Pressable
  - [ ] When enabled: show last backup time + "backup now" Pressable + "disable backup" Pressable
  - [ ] Handle OAuth response in `useEffect([response])`: on `type === 'success'` store tokens, write `backup_enabled: true` to DB, call `runBackup()`
  - [ ] "backup now" calls `runBackup()` with stored token; refreshes last backup time from DB after
  - [ ] "disable backup" calls `revokeToken()` then writes `backup_enabled: false` to DB

- [ ] Task 4: Add `BackupSettings` to settings screen (AC: 1)
  - [ ] Import and render `<BackupSettings />` in `src/app/(tabs)/settings.tsx` below `<NotificationSettings />`

- [ ] Task 5: Foreground retry in `_layout.tsx` (AC: 5)
  - [ ] Add `AppState` listener: when state changes to `'active'`, read `backup_enabled` and `last_backup_error` from DB; if both truthy, call `runBackup()`

- [ ] Task 6: Update `app.config.ts` and add i18n keys (AC: 1, 2)
  - [ ] Add `googleIosClientId` and `googleAndroidClientId` to `extra` in `app.config.ts` (from env vars `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID`)
  - [ ] Add `backup` keys to `en.json`, `hi.json`, `gu.json`

- [ ] Task 7: Verify `tsc --noEmit` passes cleanly

### Review Findings

- [x] [Review][Patch] `response.authentication` non-null assertion before async IIFE — TypeError escapes try/catch if authentication is null on type==='success' [src/components/settings/BackupSettings.tsx]
- [x] [Review][Patch] revokeToken does not check HTTP response status — 4xx/5xx silently treated as success, token may remain live on Google [src/services/backup.service.ts]
- [x] [Review][Patch] clearDriveBackup swallows individual DELETE failures — fetch() only rejects on network error; HTTP 4xx/5xx silently ignored; partial deletes return { error: null } [src/services/backup.service.ts]
- [x] [Review][Patch] No in-flight guard on foreground-retry — rapid AppState 'active' events trigger concurrent runBackup calls, racing PATCHes to Drive [src/app/_layout.tsx]
- [x] [Review][Patch] clearStoredTokens not called when stored token is null in handleDisable — AC 6 requires SecureStore entries deleted unconditionally; revokeToken is correctly skipped but clearStoredTokens must still run [src/components/settings/BackupSettings.tsx]
- [x] [Review][Defer] Expired access token triggers infinite retry loop on foreground — refresh token flow is out of scope for this story [src/app/_layout.tsx] — deferred, pre-existing
- [x] [Review][Defer] Stale last_backup_at / last_backup_error shown on re-enable — immediate backup on enable will overwrite; minor UX [src/components/settings/BackupSettings.tsx] — deferred, pre-existing

## Dev Notes

### Overview

This story adds optional Google Drive backup to the settings screen. Backup scope is `drive.appdata` only — the app cannot see the user's other Drive files, and neither can the server (there is no server). The backup is a JSON export of all user data tables, uploaded to Drive App Data folder. Restore is out of scope for this story.

The component lives at `src/components/settings/BackupSettings.tsx`. The service lives at `src/services/backup.service.ts`.

**Do NOT implement restore in this story.** Do NOT implement Google contacts sync. Do NOT touch the capture flow.

---

### Task 1 Details: DB Migration

**Next migration is m0004 (idx: 4)**. Use `when: 1781000000000`.

Add to `src/db/migrations/index.ts` after `m0003`:

```ts
const m0004 = `
ALTER TABLE \`app_prefs\` ADD COLUMN \`backup_enabled\` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`last_backup_at\` integer;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`last_backup_error\` text;
`;
```

Journal entry:
```ts
{ idx: 4, when: 1781000000000, tag: '0004_app_prefs_backup', breakpoints: true }
```

Map key: `'0004_app_prefs_backup': m0004`

**Schema update** (`src/db/schema.ts`) — add to `app_prefs` table:
```ts
backup_enabled: integer('backup_enabled').notNull().default(0),
last_backup_at: integer('last_backup_at'),
last_backup_error: text('last_backup_error'),
```

**`app-prefs.ts` updates**:

Extend `AppPrefsRow`:
```ts
backup_enabled: boolean;
last_backup_at: number | null;
last_backup_error: string | null;
```

Extend `UpsertAppPrefsInput`:
```ts
backup_enabled?: boolean;
last_backup_at?: number | null;
last_backup_error?: string | null;
```

In `getAppPrefs`, map:
```ts
backup_enabled: r.backup_enabled === 1,
last_backup_at: r.last_backup_at ?? null,
last_backup_error: r.last_backup_error ?? null,
```

In `upsertAppPrefs` update branch, add:
```ts
if (input.backup_enabled !== undefined) patch.backup_enabled = input.backup_enabled ? 1 : 0;
if ('last_backup_at' in input) patch.last_backup_at = input.last_backup_at ?? null;
if ('last_backup_error' in input) patch.last_backup_error = input.last_backup_error ?? null;
```

In `upsertAppPrefs` insert branch, add to values:
```ts
backup_enabled: input.backup_enabled ? 1 : 0,
```

Note: `last_backup_at` and `last_backup_error` default to `null` on insert and don't need to be specified.

---

### Task 2 Details: `backup.service.ts`

**File**: `src/services/backup.service.ts`

**Secure store keys** (use exact strings):
```ts
const TOKEN_KEY = 'google_drive_token';
const REFRESH_KEY = 'google_drive_refresh_token';
const DRIVE_FILE_NAME = 'gods-plan-backup.json';
```

**Imports needed**:
- `* as SecureStore from 'expo-secure-store'`
- `getDb` from `@/db`
- `contacts, memos, context_points, follow_ups` tables from `@/db/schema`
- `upsertAppPrefs` from `@/db/queries/app-prefs`

```ts
export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function storeTokens(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function clearStoredTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null);
  await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => null);
}

export async function revokeToken(
  accessToken: string,
): Promise<{ error: string | null }> {
  try {
    await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    await clearStoredTokens();
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}
```

**`runBackup` — export and upload**:
```ts
export async function runBackup(
  accessToken: string,
): Promise<{ error: string | null }> {
  try {
    const db = getDb();
    // Export all user data tables (not app_prefs, consent_state, stt_queue)
    const [allContacts, allMemos, allContextPoints, allFollowUps] = await Promise.all([
      db.select().from(contacts),
      db.select().from(memos),
      db.select().from(context_points),
      db.select().from(follow_ups),
    ]);

    const payload = JSON.stringify({
      version: 1,
      exported_at: Date.now(),
      contacts: allContacts,
      memos: allMemos,
      context_points: allContextPoints,
      follow_ups: allFollowUps,
    });

    // Find existing backup file to determine create vs update
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=name='${DRIVE_FILE_NAME}'`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) throw new Error(`Drive list failed: ${listRes.status}`);
    const listData = (await listRes.json()) as { files: Array<{ id: string }> };
    const existingFileId = listData.files[0]?.id ?? null;

    if (existingFileId) {
      // Update existing file — media-only PATCH
      const patchRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: payload,
        },
      );
      if (!patchRes.ok) throw new Error(`Drive update failed: ${patchRes.status}`);
    } else {
      // Create new file in appDataFolder
      const metadata = JSON.stringify({
        name: DRIVE_FILE_NAME,
        parents: ['appDataFolder'],
      });
      const boundary = '-------314159265358979323846';
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${payload}\r\n` +
        `--${boundary}--`;
      const createRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        },
      );
      if (!createRes.ok) throw new Error(`Drive create failed: ${createRes.status}`);
    }

    await upsertAppPrefs({ last_backup_at: Date.now(), last_backup_error: null });
    return { error: null };
  } catch (err) {
    const msg = String(err);
    await upsertAppPrefs({ last_backup_error: msg });
    return { error: msg };
  }
}
```

**`clearDriveBackup`** — used by Story 6-3 data deletion:
```ts
export async function clearDriveBackup(
  accessToken: string,
): Promise<{ error: string | null }> {
  try {
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) throw new Error(`Drive list failed: ${listRes.status}`);
    const listData = (await listRes.json()) as { files: Array<{ id: string }> };
    await Promise.all(
      listData.files.map((f) =>
        fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ),
    );
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}
```

---

### Task 3 Details: `BackupSettings.tsx`

**File**: `src/components/settings/BackupSettings.tsx`

**Imports needed**:
```ts
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAppPrefs, upsertAppPrefs } from '@/db/queries/app-prefs';
import {
  getStoredAccessToken,
  storeTokens,
  revokeToken,
  runBackup,
} from '@/services/backup.service';
```

**Module-level call (REQUIRED — must be outside the component)**:
```ts
WebBrowser.maybeCompleteAuthSession();
```

**Component structure**:
```tsx
const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;

export function BackupSettings() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [backupEnabled, setBackupEnabled] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [lastBackupError, setLastBackupError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: extra?.googleIosClientId,
    androidClientId: extra?.googleAndroidClientId,
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });

  // Load prefs on mount
  useEffect(() => {
    getAppPrefs().then(({ data, error }) => {
      if (error) { console.warn('[BackupSettings] getAppPrefs failed:', error); return; }
      if (data) {
        setBackupEnabled(data.backup_enabled);
        setLastBackupAt(data.last_backup_at);
        setLastBackupError(data.last_backup_error);
      }
    });
  }, []);

  // Handle OAuth response
  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') return;
    const { accessToken, refreshToken } = response.authentication!;
    setIsWorking(true);
    (async () => {
      try {
        await storeTokens(accessToken, refreshToken ?? undefined);
        await upsertAppPrefs({ backup_enabled: true });
        setBackupEnabled(true);
        const { error } = await runBackup(accessToken);
        const now = Date.now();
        if (error) {
          setLastBackupError(error);
        } else {
          setLastBackupAt(now);
          setLastBackupError(null);
        }
      } finally {
        setIsWorking(false);
      }
    })();
  }, [response]);

  const handleEnable = useCallback(() => {
    void promptAsync();
  }, [promptAsync]);

  const handleBackupNow = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const token = await getStoredAccessToken();
      if (!token) { console.warn('[BackupSettings] no stored token'); return; }
      const { error } = await runBackup(token);
      if (error) {
        setLastBackupError(error);
      } else {
        setLastBackupAt(Date.now());
        setLastBackupError(null);
      }
    } finally {
      setIsWorking(false);
    }
  }, [isWorking]);

  const handleDisable = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const token = await getStoredAccessToken();
      if (token) await revokeToken(token);
      await upsertAppPrefs({ backup_enabled: false });
      setBackupEnabled(false);
      setLastBackupAt(null);
      setLastBackupError(null);
    } finally {
      setIsWorking(false);
    }
  }, [isWorking]);
  // ... render
}
```

**Render — when disabled**:
```tsx
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('backup.title')}</Text>
  <Text style={[styles.disclosure, { color: theme.text }]}>{t('backup.disclosure')}</Text>
  <Pressable
    onPress={handleEnable}
    disabled={!request || isWorking}
    style={[styles.button, { backgroundColor: theme.cta, opacity: !request || isWorking ? 0.5 : 1 }]}
    accessibilityRole="button"
  >
    <Text style={[styles.buttonText, { color: theme.background }]}>{t('backup.enable')}</Text>
  </Pressable>
</View>
```

**Render — when enabled**:
```tsx
<View style={styles.section}>
  <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('backup.title')}</Text>
  {lastBackupAt ? (
    <Text style={[styles.subtitle, { color: theme.text }]}>
      {t('backup.lastBackup', { time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastBackupAt)) })}
    </Text>
  ) : null}
  {lastBackupError ? (
    <Text style={[styles.errorText, { color: '#c0392b' }]}>{t('backup.lastFailed')}</Text>
  ) : null}
  <Pressable
    onPress={() => void handleBackupNow()}
    disabled={isWorking}
    style={[styles.button, { backgroundColor: theme.cta, opacity: isWorking ? 0.5 : 1 }]}
    accessibilityRole="button"
  >
    <Text style={[styles.buttonText, { color: theme.background }]}>
      {isWorking ? t('backup.syncing') : t('backup.backupNow')}
    </Text>
  </Pressable>
  <Pressable
    onPress={() => void handleDisable()}
    disabled={isWorking}
    style={[styles.disableButton, { borderColor: theme.text, opacity: isWorking ? 0.5 : 1 }]}
    accessibilityRole="button"
  >
    <Text style={[styles.disableButtonText, { color: theme.text }]}>{t('backup.disable')}</Text>
  </Pressable>
</View>
```

**Design system rules** — same as `NotificationSettings.tsx`:
- `textTransform: 'lowercase'` on all text
- `borderRadius: 0`
- Space Mono font via `FONT_BOLD` / `FONT_REGULAR`
- Colors via `useTheme()`

---

### Task 4 Details: Settings Screen Update

In `src/app/(tabs)/settings.tsx`, add `BackupSettings` import and render it below `NotificationSettings`:

```tsx
import { BackupSettings } from '@/components/settings/BackupSettings';
// ...
<NotificationSettings />
<BackupSettings />
```

---

### Task 5 Details: Foreground Retry in `_layout.tsx`

Add this `useEffect` inside `RootLayout`, after the existing notification listener:

```ts
import { AppState } from 'react-native';
import { runBackup, getStoredAccessToken } from '@/services/backup.service';

// Inside RootLayout, after dbReady state:
useEffect(() => {
  if (!dbReady) return;
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState !== 'active') return;
    getAppPrefs().then(async ({ data }) => {
      if (!data?.backup_enabled || !data.last_backup_error) return;
      const token = await getStoredAccessToken();
      if (!token) return;
      await runBackup(token);
    });
  });
  return () => subscription.remove();
}, [dbReady]);
```

---

### Task 6 Details: `app.config.ts` and i18n

**`app.config.ts`** — add to `extra`:
```ts
googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? '',
googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID ?? '',
```

The developer needs to:
1. Create a Google Cloud Console project
2. Enable the Google Drive API
3. Create OAuth 2.0 credentials: iOS type (with bundle ID `com.godsplan.app`) and Android type (with package `com.godsplan.app` and SHA-1 from `eas credentials`)
4. Add the client IDs to `.env.local`:
   ```
   GOOGLE_IOS_CLIENT_ID=<iOS client ID from Google Cloud Console>
   GOOGLE_ANDROID_CLIENT_ID=<Android client ID from Google Cloud Console>
   ```
5. Add both to EAS secrets for CI builds

**i18n keys** — add under `"backup"` in all three locales:

`en.json`:
```json
"backup": {
  "title": "google drive backup",
  "disclosure": "your data will be saved to your google drive — only you can access it",
  "enable": "enable backup",
  "disable": "disable backup",
  "backupNow": "backup now",
  "syncing": "syncing...",
  "lastBackup": "last backup: {{time}}",
  "lastFailed": "last sync failed — will retry"
}
```

`hi.json`:
```json
"backup": {
  "title": "गूगल ड्राइव बैकअप",
  "disclosure": "आपका डेटा आपके गूगल ड्राइव में सेव होगा — सिर्फ आप एक्सेस कर सकते हैं",
  "enable": "बैकअप चालू करें",
  "disable": "बैकअप बंद करें",
  "backupNow": "अभी बैकअप करें",
  "syncing": "सिंक हो रहा है...",
  "lastBackup": "आखिरी बैकअप: {{time}}",
  "lastFailed": "पिछला सिंक विफल — फिर से कोशिश होगी"
}
```

`gu.json`:
```json
"backup": {
  "title": "ગૂગલ ડ્રાઇવ બૅકઅપ",
  "disclosure": "તમારો ડેટા તમારા ગૂગલ ડ્રાઇવમાં સૅવ થશે — ફક્ત તમે જ એક્સેસ કરી શકો",
  "enable": "બૅકઅપ ચાલુ કરો",
  "disable": "બૅકઅપ બંધ કરો",
  "backupNow": "હમણાં બૅકઅપ કરો",
  "syncing": "સિંક થઈ રહ્યું છે...",
  "lastBackup": "છેલ્લો બૅકઅપ: {{time}}",
  "lastFailed": "છેલ્લો સિંક નિષ્ફળ — ફરી પ્રયત્ન થશે"
}
```

---

### Critical Patterns to Preserve

**`expo-auth-session` hook rules**:
- `WebBrowser.maybeCompleteAuthSession()` MUST be called at module level (outside the component function), not inside a hook or effect
- `Google.useAuthRequest` hook must be called unconditionally at component top level (React hook rules)
- `promptAsync()` is what triggers the OAuth browser — call it from the "enable backup" button press handler
- The `response` effect dependency is just `[response]` — do not include `promptAsync` in that effect

**Token handling**:
- Access token expiry: Google access tokens expire in 1 hour. For this MVP story, if the backup fails with 401, set `last_backup_error` and show the "last sync failed" UI. Token refresh (using the refresh token) is out of scope for this story.
- The `authentication` object on `response` (when `type === 'success'`) has `accessToken` and `refreshToken` — always store both.
- `response.authentication!` non-null assertion is safe when `response.type === 'success'`

**Drive API calls**:
- Always include `Authorization: Bearer ${accessToken}` header
- The `spaces=appDataFolder` query param is what restricts to the app's private folder
- Only ONE backup file (`gods-plan-backup.json`) should ever exist — always check for existing file before creating
- Audio files (`memos.audio_path`) are device-local paths — they're included in the JSON as-is, but won't be restorable (paths won't exist on another device). This is acceptable for MVP.

**DB update pattern in `runBackup`**:
- On success: `await upsertAppPrefs({ last_backup_at: Date.now(), last_backup_error: null })`
- On failure: `await upsertAppPrefs({ last_backup_error: msg })`
- Use `'last_backup_error' in input` (not `input.last_backup_error !== undefined`) in `upsertAppPrefs` to handle explicit `null` writes — this is how the existing `last_backup_at` field should be handled too

**Service return pattern**:
- All service functions follow `{ data?, error: string | null }` pattern — never throw
- The `upsertAppPrefs` call inside `runBackup` is fire-and-forget after the Drive call completes; wrap in try/catch if needed but don't let DB failures mask the backup result

**Settings screen pattern**:
- The settings screen has `SafeAreaView` from `react-native-safe-area-context` (already fixed in Story 6-1 code review)
- `BackupSettings` is added after `NotificationSettings` inside the same `ScrollView`
- Keep the component as a named export (`export function BackupSettings`)

**`_layout.tsx` foreground retry**:
- The `useEffect` that adds `AppState` listener must depend on `[dbReady]` — don't register the listener before DB is initialized
- The retry fires silently — no user-visible loading state from `_layout.tsx`
- If the retry fails again, `runBackup` updates `last_backup_error` in DB — the component will show it on next render

---

### Existing Code to Not Break

| File | What to preserve |
|------|-----------------|
| `src/db/queries/app-prefs.ts` | All existing fields in `AppPrefsRow` and `UpsertAppPrefsInput` — only extend, never remove |
| `src/app/(tabs)/settings.tsx` | `NotificationSettings` import and render must remain |
| `src/app/_layout.tsx` | All existing effects (DB init, notification listener, re-engage logic) — add AppState listener as new `useEffect` only |
| `src/db/migrations/index.ts` | Never modify existing migrations m0000-m0003 — append m0004 only |

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual test:
1. Open settings → see disclosure + "enable backup" button
2. Tap enable → Google OAuth browser opens → sign in → backup runs → "last backup: [time]" shown
3. Kill app, re-open settings → last backup time still shown (persisted)
4. Tap "backup now" → updates timestamp
5. Tap "disable backup" → returns to disclosure view
6. Test foreground retry: disconnect network, tap "backup now" → "last sync failed" shown → reconnect → background app → foreground → retry fires silently

---

### File List

- `src/db/migrations/index.ts` (UPDATED — m0004)
- `src/db/schema.ts` (UPDATED — 3 columns on app_prefs)
- `src/db/queries/app-prefs.ts` (UPDATED — backup fields)
- `src/services/backup.service.ts` (NEW)
- `src/components/settings/BackupSettings.tsx` (NEW)
- `src/app/(tabs)/settings.tsx` (UPDATED — BackupSettings added)
- `src/app/_layout.tsx` (UPDATED — AppState foreground retry)
- `app.config.ts` (UPDATED — Google client IDs)
- `src/constants/i18n/locales/en.json` (UPDATED — backup keys)
- `src/constants/i18n/locales/hi.json` (UPDATED — backup keys)
- `src/constants/i18n/locales/gu.json` (UPDATED — backup keys)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### Change Log
