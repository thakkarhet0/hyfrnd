import * as FileSystem from 'expo-file-system/legacy';

import { getDb } from '@/db/index';
import { rotateEncryptionKey } from '@/db/encryption';
import { contacts, memos, context_points, follow_ups, stt_queue, consent_state, app_prefs } from '@/db/schema';
import { getAppPrefs } from '@/db/queries/app-prefs';
import { clearDriveBackup, getStoredAccessToken, clearStoredTokens } from '@/services/backup.service';

export async function deleteAllData(): Promise<{ error: string | null }> {
  try {
    const db = getDb();

    // Collect file paths before deleting rows
    const allMemos = await db.select({ audio_path: memos.audio_path }).from(memos);
    const allContacts = await db.select({ photo_uri: contacts.photo_uri }).from(contacts);

    // Clear Drive backup (best-effort — do not block deletion on failure)
    const { data: prefs } = await getAppPrefs();
    if (prefs?.backup_enabled) {
      const token = await getStoredAccessToken();
      if (token) {
        await clearDriveBackup(token).catch((err) =>
          console.warn('[deletion] Drive backup clear failed:', err),
        );
      }
    }
    // Always clear stored OAuth tokens regardless of backup_enabled state — idempotent
    await clearStoredTokens().catch((err) =>
      console.warn('[deletion] clearStoredTokens failed:', err),
    );

    // Delete all DB rows in foreign-key dependency order
    await db.delete(stt_queue);
    await db.delete(context_points);
    await db.delete(follow_ups);
    await db.delete(memos);
    await db.delete(contacts);
    await db.delete(consent_state);
    await db.delete(app_prefs);

    // Delete audio files from device storage
    for (const { audio_path } of allMemos) {
      if (audio_path) {
        await FileSystem.deleteAsync(audio_path, { idempotent: true }).catch(() => null);
      }
    }

    // Delete contact photo files (only device-local files, not external URIs)
    const docDir = FileSystem.documentDirectory;
    if (docDir) {
      for (const { photo_uri } of allContacts) {
        if (photo_uri && photo_uri.startsWith(docDir)) {
          await FileSystem.deleteAsync(photo_uri, { idempotent: true }).catch(() => null);
        }
      }
    }

    // Rotate SQLCipher encryption key — best-effort; data is already wiped so a failure
    // here must not prevent the caller from navigating to onboarding.
    await rotateEncryptionKey().catch((err) =>
      console.warn('[deletion] rotateEncryptionKey failed (non-fatal):', err),
    );

    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}
