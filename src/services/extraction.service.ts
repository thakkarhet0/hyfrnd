import Constants from 'expo-constants';

import { getMemoTranscript } from '@/db/queries/memos';
import type { ExtractionResult } from '@/constants/extraction';
import { buildExtractionMessages } from '@/constants/extraction';
import { track, ANALYTICS_EVENTS } from '@/services/analytics.service';

export type { ExtractionResult } from '@/constants/extraction';

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;

interface ClaudeContent {
  type: string;
  text: string;
}

interface ClaudeResponse {
  content: ClaudeContent[];
  stop_reason: string;
}

// Claude (esp. Haiku) sometimes wraps its JSON in a ```json ... ``` markdown fence or adds
// prose around it, despite the "no markdown" instruction — which breaks a raw JSON.parse.
// Slice the outermost {...} object out of whatever wrapping is present, then parse. On failure,
// include the raw response text in the error so the cause is visible instead of just "Unexpected character".
function parseJsonResponse(text: string): unknown {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  const candidate = first !== -1 && last > first ? text.slice(first, last + 1) : text;
  try {
    return JSON.parse(candidate);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${msg} | raw response: ${JSON.stringify(text.slice(0, 200))}`);
  }
}

export async function extractFromTranscript(
  memoId: string,
): Promise<{ data: ExtractionResult | null; error: Error | null }> {
  const { data: transcript, error: transcriptError } = await getMemoTranscript(memoId);
  if (transcriptError) return { data: null, error: transcriptError };
  if (!transcript) return { data: null, error: new Error('no_transcript') };

  const claudeApiKey = extra?.claudeApiKey ?? '';
  const { system, userMessage } = buildExtractionMessages(transcript);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let result: ExtractionResult | null = null;
  let extractionError: Error | null = null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const json = (await response.json()) as ClaudeResponse;
    const textBlock = json.content.find((b) => b.type === 'text');
    if (!textBlock) throw new Error('Claude returned no text content');

    const parsed = parseJsonResponse(textBlock.text) as ExtractionResult;
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Claude response is not a JSON object');
    }

    const nameVal = typeof parsed.name === 'string' ? parsed.name.trim() : null;
    const followUpDateVal =
      typeof parsed.follow_up_date === 'string' ? parsed.follow_up_date.trim() : null;
    const followUpIntentVal =
      typeof parsed.follow_up_intent === 'string' ? parsed.follow_up_intent.trim() : null;
    const contextPointsVal = Array.isArray(parsed.context_points)
      ? (parsed.context_points as unknown[])
          .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
          .map((p) => p.trim())
      : null;

    result = {
      name: nameVal && nameVal.length > 0 ? nameVal : null,
      context_points: contextPointsVal && contextPointsVal.length > 0 ? contextPointsVal : null,
      follow_up_date: followUpDateVal && followUpDateVal.length > 0 ? followUpDateVal : null,
      follow_up_intent:
        followUpIntentVal && followUpIntentVal.length > 0 ? followUpIntentVal : null,
    };
  } catch (err) {
    extractionError = err instanceof Error ? err : new Error(String(err));
  } finally {
    clearTimeout(timeoutId);
  }

  if (result) {
    const nullFields: string[] = [];
    if (result.name === null) nullFields.push('name');
    if (result.context_points === null) nullFields.push('context_points');
    if (result.follow_up_date === null) nullFields.push('follow_up_date');
    if (result.follow_up_intent === null) nullFields.push('follow_up_intent');
    track(ANALYTICS_EVENTS.EXTRACTION_COMPLETE, { success: true, null_fields: nullFields });
    return { data: result, error: null };
  }

  track(ANALYTICS_EVENTS.EXTRACTION_COMPLETE, { success: false, null_fields: [] });
  return { data: null, error: extractionError ?? new Error('extraction_failed') };
}
