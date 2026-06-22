import { eq, or } from 'drizzle-orm';

import { getDb } from '@/db/index';
import { stt_queue } from '@/db/schema';

export async function insertQueueItem(data: {
  memoId: string;
  audioPath: string;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .insert(stt_queue)
      .values({
        memo_id: data.memoId,
        audio_path: data.audioPath,
        attempts: 0,
        status: 'pending',
        created_at: Date.now(),
      })
      .returning({ id: stt_queue.id });
    return { data: rows[0].id, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateQueueItemStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.update(stt_queue).set({ status }).where(eq(stt_queue.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// Reset failed items (and items orphaned in 'processing' by an app kill mid-run) back to
// 'pending' so the queue processor will pick them up again. Used by the manual retry action.
export async function requeueFailedItems(): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db
      .update(stt_queue)
      .set({ status: 'pending' })
      .where(or(eq(stt_queue.status, 'failed'), eq(stt_queue.status, 'processing')));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getPendingQueueItems(): Promise<{
  data: { id: string; memo_id: string; audio_path: string; attempts: number }[] | null;
  error: Error | null;
}> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: stt_queue.id,
        memo_id: stt_queue.memo_id,
        audio_path: stt_queue.audio_path,
        attempts: stt_queue.attempts,
      })
      .from(stt_queue)
      .where(eq(stt_queue.status, 'pending'))
      .orderBy(stt_queue.created_at);
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
