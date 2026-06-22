import { asc, eq } from 'drizzle-orm';

import { getDb } from '@/db/index';
import { context_points } from '@/db/schema';

export interface ContextPoint {
  id: string;
  memo_id: string;
  content: string;
  created_at: number;
}

export async function getContextPointsForMemo(
  memoId: string,
): Promise<{ data: ContextPoint[] | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: context_points.id,
        memo_id: context_points.memo_id,
        content: context_points.content,
        created_at: context_points.created_at,
      })
      .from(context_points)
      .where(eq(context_points.memo_id, memoId))
      .orderBy(asc(context_points.created_at));
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function insertContextPoint(data: {
  memoId: string;
  content: string;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .insert(context_points)
      .values({
        memo_id: data.memoId,
        content: data.content,
        created_at: Date.now(),
      })
      .returning({ id: context_points.id });
    return { data: rows[0].id, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateContextPoint(
  id: string,
  content: string,
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.update(context_points).set({ content }).where(eq(context_points.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteContextPoint(
  id: string,
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.delete(context_points).where(eq(context_points.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
