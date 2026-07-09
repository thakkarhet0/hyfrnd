export interface ExtractionResult {
  name: string | null;
  name_native: string | null;
  context_points: string[] | null;
  follow_up_date: string | null;
  follow_up_intent: string | null;
}

const SYSTEM_PROMPT = `You are a personal CRM assistant. Extract structured information from voice memo transcripts.
Return ONLY valid JSON with this exact shape — no markdown, no explanation, just JSON:
{
  "name": string or null,
  "name_native": string or null,
  "context_points": string[] or null,
  "follow_up_date": string or null,
  "follow_up_intent": string or null
}
Rules:
- name: the person the memo is about(usually the one who the user was on call with). ALWAYS write/transliterate the name in English (Latin script) so it matches English contacts. null if not inferable.
- name_native: the exact name of the person written in their native script (e.g. Devanagari/Hindi script like "भव्य" or Gujarati script like "ભવ્ય") if spoken/written in Hindi or Gujarati. null if spoken/transcribed in English or if not inferable.
- context_points: 1–5 short bullet facts about the interaction or person. ALWAYS write these in the same language/script as the input transcript (e.g. if the transcript is in Gujarati, write the bullets in Gujarati; do not translate to English). null if nothing inferable.
- follow_up_date: ISO 8601 date string (YYYY-MM-DD) if a follow-up time is mentioned (calculate relative dates based on Today's Date). null otherwise.
- follow_up_intent: brief phrase describing what the follow-up is for. ALWAYS write this in the same language/script as the input transcript (e.g. if the transcript is in Gujarati, write it in Gujarati; do not translate to English). null if no follow-up mentioned.
- Use null (not empty string, not empty array) for fields you cannot infer.`;

export function buildExtractionMessages(
  transcript: string,
  referenceDateStr?: string,
): {
  system: string;
  userMessage: string;
} {
  const systemPromptWithDate = referenceDateStr
    ? `${SYSTEM_PROMPT}\n\nToday's Date: ${referenceDateStr}`
    : SYSTEM_PROMPT;

  return {
    system: systemPromptWithDate,
    userMessage: `Transcript: ${transcript}`,
  };
}
