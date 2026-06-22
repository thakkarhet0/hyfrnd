import Constants from 'expo-constants';
import { File } from 'expo-file-system';

import { updateMemoTranscript } from '@/db/queries/memos';
import { getSttConsentGranted } from '@/db/queries/consent';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { useAppStore } from '@/stores/app.store';

export interface QueueItem {
  id: string;
  memo_id: string;
  audio_path: string;
  attempts: number;
}

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;

async function transcribeWithSarvam(audioPath: string, languageCode: string): Promise<string> {
  const key = extra?.sarvamApiKey ?? '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const formData = new FormData();
    // expo/fetch (the global fetch in Expo SDK 56) does not accept React Native's
    // { uri, type, name } file parts — it needs a Blob. expo-file-system's File implements Blob.
    formData.append('file', new File(audioPath) as unknown as Blob);
    formData.append('language_code', languageCode);
    formData.append('model', 'saarika:v2.5');

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': key },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Sarvam AI error: ${response.status} ${body}`);
    }
    const json = (await response.json()) as { transcript?: string };
    if (!json.transcript) throw new Error('Sarvam AI returned no transcript');
    return json.transcript;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function transcribeWithElevenLabs(audioPath: string, languageCode: string): Promise<string> {
  const key = extra?.elevenLabsApiKey ?? '';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const formData = new FormData();
    // See note above: expo/fetch needs a Blob, not a { uri } part. File implements Blob.
    // ElevenLabs STT expects multipart fields `file` and `language_code` (ISO-639-1/3).
    formData.append('file', new File(audioPath) as unknown as Blob);
    formData.append('model_id', 'scribe_v1');
    formData.append('language_code', languageCode);

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': key },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`ElevenLabs STT error: ${response.status} ${body}`);
    }
    const json = (await response.json()) as { text?: string };
    if (!json.text) throw new Error('ElevenLabs returned no transcript');
    return json.text;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function processQueueItem(
  item: QueueItem,
): Promise<{ data: string | null; error: Error | null }> {
  // Critical Invariant 2: consent gate enforced here, not in UI
  const { data: consentGranted } = await getSttConsentGranted();
  if (!consentGranted) {
    return { data: null, error: new Error('stt_consent_not_granted') };
  }

  const language = useAppStore.getState().language;
  const langEntry = SUPPORTED_LANGUAGES[language];
  const sarvamCode = langEntry.sarvamCode;
  const elevenLabsCode = langEntry.elevenLabsCode;

  let sarvamError: Error | null = null;
  try {
    const transcript = await transcribeWithSarvam(item.audio_path, sarvamCode);
    const { error: dbError } = await updateMemoTranscript(item.memo_id, transcript);
    if (dbError) return { data: null, error: dbError };
    return { data: transcript, error: null };
  } catch (err) {
    sarvamError = err instanceof Error ? err : new Error(String(err));
    console.warn('[STT] Sarvam AI failed, trying ElevenLabs fallback:', sarvamError.message);
  }

  try {
    const transcript = await transcribeWithElevenLabs(item.audio_path, elevenLabsCode);
    const { error: dbError } = await updateMemoTranscript(item.memo_id, transcript);
    if (dbError) return { data: null, error: dbError };
    return { data: transcript, error: null };
  } catch (fallbackErr) {
    const combinedMessage = `Sarvam: ${sarvamError?.message}; ElevenLabs: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`;
    return { data: null, error: new Error(combinedMessage) };
  }
}
