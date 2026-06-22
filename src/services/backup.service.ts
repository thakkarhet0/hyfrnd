import * as SecureStore from 'expo-secure-store';

import { getDb } from '@/db/index';
import { contacts, memos, context_points, follow_ups } from '@/db/schema';
import { upsertAppPrefs } from '@/db/queries/app-prefs';

const TOKEN_KEY = 'google_drive_token';
const REFRESH_KEY = 'google_drive_refresh_token';
const DRIVE_FILE_NAME = 'gods-plan-backup.json';

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
    const revokeRes = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    await clearStoredTokens();
    if (!revokeRes.ok) throw new Error(`Revoke failed: ${revokeRes.status}`);
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function runBackup(
  accessToken: string,
): Promise<{ error: string | null }> {
  try {
    const db = getDb();
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

    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=name%3D'${DRIVE_FILE_NAME}'`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) throw new Error(`Drive list failed: ${listRes.status}`);
    const listData = (await listRes.json()) as { files: { id: string }[] };
    const existingFileId = listData.files[0]?.id ?? null;

    if (existingFileId) {
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
      const boundary = '-------314159265358979323846';
      const metadata = JSON.stringify({ name: DRIVE_FILE_NAME, parents: ['appDataFolder'] });
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

export async function clearDriveBackup(
  accessToken: string,
): Promise<{ error: string | null }> {
  try {
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) throw new Error(`Drive list failed: ${listRes.status}`);
    const listData = (await listRes.json()) as { files: { id: string }[] };
    const deleteResults = await Promise.all(
      listData.files.map((f) =>
        fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ),
    );
    const failed = deleteResults.filter((r) => !r.ok);
    if (failed.length > 0) throw new Error(`Drive delete failed for ${failed.length} file(s)`);
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}
