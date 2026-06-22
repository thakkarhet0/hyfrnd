import { eq, inArray, like, max, min, sql } from 'drizzle-orm';

import { getDb } from '@/db/index';
import { contacts, context_points, follow_ups, memos, stt_queue } from '@/db/schema';

export interface ContactListItem {
  id: string;
  name: string;
  last_interaction: number | null;
  next_follow_up: number | null;
}

export interface ContactDetail {
  id: string;
  name: string;
  phone: string | null;
  photo_uri: string | null;
  created_at: number;
}

export async function insertContact(data: {
  name: string;
  phone?: string | null;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .insert(contacts)
      .values({
        name: data.name,
        phone: data.phone ?? null,
        created_at: Date.now(),
        updated_at: Date.now(),
      })
      .returning({ id: contacts.id });
    return { data: rows[0].id, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getContactsForList(): Promise<{
  data: ContactListItem[] | null;
  error: Error | null;
}> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        last_interaction: max(memos.created_at),
        next_follow_up: min(
          sql<number>`CASE WHEN ${follow_ups.status} = 'pending' THEN ${follow_ups.due_date} END`,
        ),
      })
      .from(contacts)
      .leftJoin(memos, eq(memos.contact_id, contacts.id))
      .leftJoin(follow_ups, eq(follow_ups.contact_id, contacts.id))
      .groupBy(contacts.id, contacts.name)
      .orderBy(
        sql`MIN(CASE WHEN ${follow_ups.status} = 'pending' THEN ${follow_ups.due_date} END) ASC NULLS LAST`,
        sql`MAX(${memos.created_at}) DESC NULLS LAST`,
      );
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        last_interaction: r.last_interaction ?? null,
        next_follow_up: r.next_follow_up != null ? Number(r.next_follow_up) : null,
      })),
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getContactDetail(
  id: string,
): Promise<{ data: ContactDetail | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        photo_uri: contacts.photo_uri,
        created_at: contacts.created_at,
      })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (rows.length === 0) return { data: null, error: null };
    return { data: rows[0], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function updateContact(
  id: string,
  data: { name?: string; phone?: string | null; photo_uri?: string | null },
): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db
      .update(contacts)
      .set({ ...data, updated_at: Date.now() })
      .where(eq(contacts.id, id));
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function deleteContact(id: string): Promise<{ data: null; error: Error | null }> {
  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      const memoRows = await tx
        .select({ id: memos.id })
        .from(memos)
        .where(eq(memos.contact_id, id));
      const memoIds = memoRows.map((m) => m.id);

      if (memoIds.length > 0) {
        await tx.delete(stt_queue).where(inArray(stt_queue.memo_id, memoIds));
        await tx.delete(context_points).where(inArray(context_points.memo_id, memoIds));
      }

      await tx.delete(follow_ups).where(eq(follow_ups.contact_id, id));
      await tx.delete(memos).where(eq(memos.contact_id, id));
      await tx.delete(contacts).where(eq(contacts.id, id));
    });
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function findContactsByName(
  name: string,
): Promise<{ data: { id: string; name: string }[] | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(like(contacts.name, `%${name}%`))
      .limit(3);
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function searchContacts(
  query: string,
): Promise<{ data: ContactListItem[] | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        last_interaction: max(memos.created_at),
        next_follow_up: min(
          sql<number>`CASE WHEN ${follow_ups.status} = 'pending' THEN ${follow_ups.due_date} END`,
        ),
      })
      .from(contacts)
      .where(like(contacts.name, `%${query}%`))
      .leftJoin(memos, eq(memos.contact_id, contacts.id))
      .leftJoin(follow_ups, eq(follow_ups.contact_id, contacts.id))
      .groupBy(contacts.id, contacts.name)
      .orderBy(
        sql`MIN(CASE WHEN ${follow_ups.status} = 'pending' THEN ${follow_ups.due_date} END) ASC NULLS LAST`,
        sql`MAX(${memos.created_at}) DESC NULLS LAST`,
      );
    return {
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        last_interaction: r.last_interaction ?? null,
        next_follow_up: r.next_follow_up != null ? Number(r.next_follow_up) : null,
      })),
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getContactCount(): Promise<{ data: number; error: Error | null }> {
  try {
    const db = getDb();
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(contacts);
    return { data: Number(result[0].count), error: null };
  } catch (err) {
    return { data: 0, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getContact(
  id: string,
): Promise<{ data: { id: string; name: string } | null; error: Error | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (rows.length === 0) return { data: null, error: null };
    return { data: rows[0], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
