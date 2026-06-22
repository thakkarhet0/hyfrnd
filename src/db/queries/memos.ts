import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/db/index';
import { memos } from '@/db/schema';

export interface MemoWithId {
  id: string;
  audio_path: string;
  raw_transcript: string | null;
  status: 'pending' | 'extracted' | 'failed';
  created_at: number;
}

export async function getMemosForContact(
  contactId: string,
): Promise<{ data: MemoWithId[] | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: memos.id,
        audio_path: memos.audio_path,
        raw_transcript: memos.raw_transcript,
        status: memos.status,
        created_at: memos.created_at,
      })
      .from(memos)
      .where(eq(memos.contact_id, contactId))
      .orderBy(desc(memos.created_at));
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getMemoTranscript(
  id: string,
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({ raw_transcript: memos.raw_transcript })
      .from(memos)
      .where(eq(memos.id, id))
      .limit(1);
    if (rows.length === 0) return { data: null, error: null };
    return { data: rows[0].raw_transcript ?? null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function insertMemo(data: {
  audioPath: string;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .insert(memos)
      .values({
        audio_path: data.audioPath,
        status: 'pending',
        created_at: Date.now(),
      })
      .returning({ id: memos.id });
    return { data: rows[0].id, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateMemoTranscript(
  id: string,
  transcript: string,
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.update(memos).set({ raw_transcript: transcript }).where(eq(memos.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateMemoContact(
  id: string,
  contactId: string,
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.update(memos).set({ contact_id: contactId }).where(eq(memos.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateMemoStatus(
  id: string,
  status: 'pending' | 'extracted' | 'failed',
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.update(memos).set({ status }).where(eq(memos.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
