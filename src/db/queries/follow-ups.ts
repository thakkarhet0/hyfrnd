import { asc, eq } from 'drizzle-orm';
import { contacts, follow_ups } from '@/db/schema';

import { getDb } from '@/db/index';

export interface FollowUp {
  id: string;
  contact_id: string;
  memo_id: string | null;
  due_date: number;
  status: 'pending' | 'completed' | 'snoozed';
  context_snapshot: string | null;
}

export async function getFollowUpsForContact(
  contactId: string,
): Promise<{ data: FollowUp[] | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: follow_ups.id,
        contact_id: follow_ups.contact_id,
        memo_id: follow_ups.memo_id,
        due_date: follow_ups.due_date,
        status: follow_ups.status,
        context_snapshot: follow_ups.context_snapshot,
      })
      .from(follow_ups)
      .where(eq(follow_ups.contact_id, contactId))
      .orderBy(asc(follow_ups.due_date));
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateFollowUpStatus(
  id: string,
  status: 'pending' | 'completed' | 'snoozed',
  newDueDate?: number,
): Promise<{ error: string | null }> {
  try {
    const db = getDb();
    const updates: Partial<typeof follow_ups.$inferInsert> = { status };
    if (newDueDate !== undefined) updates.due_date = newDueDate;
    await db.update(follow_ups).set(updates).where(eq(follow_ups.id, id));
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

export interface PendingFollowUp extends FollowUp {
  contact_name: string;
}

export async function getAllPendingFollowUps(): Promise<{
  data: PendingFollowUp[] | null;
  error: string | null;
}> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: follow_ups.id,
        contact_id: follow_ups.contact_id,
        contact_name: contacts.name,
        memo_id: follow_ups.memo_id,
        due_date: follow_ups.due_date,
        status: follow_ups.status,
        context_snapshot: follow_ups.context_snapshot,
      })
      .from(follow_ups)
      .innerJoin(contacts, eq(follow_ups.contact_id, contacts.id))
      .where(eq(follow_ups.status, 'pending'))
      .orderBy(asc(follow_ups.due_date));
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function insertFollowUp(data: {
  contactId: string;
  memoId: string;
  dueDate: number;
  contextSnapshot: string | null;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .insert(follow_ups)
      .values({
        contact_id: data.contactId,
        memo_id: data.memoId,
        due_date: data.dueDate,
        status: 'pending',
        context_snapshot: data.contextSnapshot,
        created_at: Date.now(),
      })
      .returning({ id: follow_ups.id });
    return { data: rows[0].id, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
