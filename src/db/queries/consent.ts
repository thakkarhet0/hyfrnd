import { eq } from 'drizzle-orm';

import { getDb } from '@/db/index';
import { consent_state } from '@/db/schema';

export async function getSttConsentGranted(): Promise<{ data: boolean; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({ stt_consent_granted: consent_state.stt_consent_granted })
      .from(consent_state)
      .where(eq(consent_state.id, 1))
      .limit(1);
    if (rows.length === 0) return { data: false, error: null };
    return { data: rows[0].stt_consent_granted === 1, error: null };
  } catch (err) {
    return { data: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function upsertConsentState(
  sttGranted: boolean,
): Promise<{ error: string | null }> {
  try {
    const db = getDb();
    const existing = await db
      .select({ id: consent_state.id })
      .from(consent_state)
      .where(eq(consent_state.id, 1))
      .limit(1);
    const now = Date.now();
    if (existing.length > 0) {
      await db
        .update(consent_state)
        .set({ stt_consent_granted: sttGranted ? 1 : 0, consent_version: 1, updated_at: now })
        .where(eq(consent_state.id, 1));
    } else {
      await db.insert(consent_state).values({
        id: 1,
        stt_consent_granted: sttGranted ? 1 : 0,
        consent_version: 1,
        updated_at: now,
      });
    }
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}
