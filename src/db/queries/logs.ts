import { nanoid } from 'nanoid';
import { getDb } from '@/db/index';
import { extraction_logs } from '@/db/schema';

export interface InsertLogParams {
  id?: string;
  memoId: string | null;
  rawTranscript: string | null;
  extractedName: string | null;
  extractedContextPoints: string[] | null;
  extractedFollowUpDate: string | null;
  extractedFollowUpIntent: string | null;
  audioPath: string | null;
}

export async function insertExtractionLog(
  data: InsertLogParams,
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const db = getDb();
    const logId = data.id ?? nanoid();
    const contextPointsStr = data.extractedContextPoints
      ? JSON.stringify(data.extractedContextPoints)
      : null;

    await db.insert(extraction_logs).values({
      id: logId,
      memo_id: data.memoId,
      raw_transcript: data.rawTranscript,
      extracted_name: data.extractedName,
      extracted_context_points: contextPointsStr,
      extracted_follow_up_date: data.extractedFollowUpDate,
      extracted_follow_up_intent: data.extractedFollowUpIntent,
      audio_path: data.audioPath,
      created_at: Date.now(),
    });

    return { data: logId, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
