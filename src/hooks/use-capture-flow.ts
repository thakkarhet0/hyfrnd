import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';

import { insertMemo } from '@/db/queries/memos';
import { insertQueueItem } from '@/db/queries/queue';
import { useCaptureStore } from '@/stores/capture.store';

const AUDIO_DIR = (FileSystem.documentDirectory ?? '') + 'audio/';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

/**
 * Capture recording flow with explicit pause/resume.
 *
 *   idle ──startRecording──▶ recording ──pause──▶ paused
 *                              ▲                    │
 *                              └──── resume ────────┘
 *   paused ──discard──▶ idle (audio deleted)
 *   paused ──finish───▶ processing (audio persisted, memo + queue created)
 *
 * Nothing is persisted or enqueued until `finishRecording` ("done"), so the
 * recording can be paused/resumed any number of times and abandoned cleanly.
 */
export function useCaptureFlow() {
  const store = useCaptureStore();
  // expo-audio returns a stable recorder instance.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // True between the first record() and the finalizing stop() — covers paused too.
  const sessionRef = useRef(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [error, setError] = useState<string | null>(null);

  // Stop any unfinalized recording and reset store on unmount so the mic is
  // released and we never leave stale recording/paused state behind.
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        recorder.stop().catch(() => {});
        sessionRef.current = false;
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      }
      store.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = useCallback(async () => {
    if (sessionRef.current) return; // guard against double-tap / re-entry

    let audioModeSet = false;
    try {
      setError(null);

      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setPermissionStatus('denied');
        return;
      }
      setPermissionStatus('granted');

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      audioModeSet = true;

      await recorder.prepareToRecordAsync();
      recorder.record();
      sessionRef.current = true;
      store.setIsRecording(true);
      store.setIsPaused(false);
      store.setHasRecorded(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      if (audioModeSet) {
        setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      }
      store.reset();
      sessionRef.current = false;
      setError(err instanceof Error ? err.message : 'recording failed to start');
    }
  }, [recorder, store]);

  // Pause the active recording without finalizing the file — the user can resume
  // or choose delete/done.
  const pauseRecording = useCallback(() => {
    if (!sessionRef.current || !store.isRecording) return;
    try {
      recorder.pause();
      store.setIsRecording(false);
      store.setIsPaused(true);
      store.setHasRecorded(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'recording failed to pause');
    }
  }, [recorder, store]);

  // Resume after a pause — appends to the same recording.
  const resumeRecording = useCallback(() => {
    if (!sessionRef.current || !store.isPaused) return;
    try {
      recorder.record();
      store.setIsRecording(true);
      store.setIsPaused(false);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'recording failed to resume');
    }
  }, [recorder, store]);

  // "Done": finalize the file, persist it, and enqueue for transcription. Sets
  // isProcessing so the screen advances to the processing/transcript step.
  const finishRecording = useCallback(async () => {
    if (!sessionRef.current) return;

    let permanentPath: string;
    try {
      await recorder.stop();
      sessionRef.current = false;
      const tempUri = recorder.uri;
      if (!tempUri) throw new Error('recording URI is null after stop');

      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
      // AUDIO-FIRST: persist to permanent storage BEFORE any state update.
      permanentPath = AUDIO_DIR + 'memo-' + Date.now() + '.m4a';
      await FileSystem.moveAsync({ from: tempUri, to: permanentPath });

      store.setRecordingUri(permanentPath);
      store.setIsRecording(false);
      store.setIsPaused(false);
      store.setHasRecorded(true);
    } catch (err) {
      recorder.stop().catch(() => {});
      sessionRef.current = false;
      store.reset();
      setError(err instanceof Error ? err.message : 'recording failed to finish');
      return;
    }

    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // DB persistence — separate try/catch so store.reset() is never called on DB
    // error (audio is already safe on disk).
    try {
      const { data: memoId, error: memoErr } = await insertMemo({ audioPath: permanentPath });
      if (memoErr || !memoId) {
        console.error('[capture] insertMemo failed:', memoErr);
        setError(memoErr?.message ?? 'failed to save memo record');
        return;
      }
      const { error: queueErr } = await insertQueueItem({ memoId, audioPath: permanentPath });
      if (queueErr) {
        console.error('[capture] insertQueueItem failed:', queueErr);
        setError(queueErr.message);
        return;
      }
      store.setMemoId(memoId);
      store.setIsProcessing(true);
    } catch (dbErr) {
      setError(dbErr instanceof Error ? dbErr.message : 'db error during memo save');
    }
  }, [recorder, store]);

  // "Delete": discard the in-progress recording and return to square one.
  const discardRecording = useCallback(async () => {
    try {
      if (sessionRef.current) {
        await recorder.stop().catch(() => {});
        sessionRef.current = false;
        const tempUri = recorder.uri;
        if (tempUri) await FileSystem.deleteAsync(tempUri, { idempotent: true });
      }
      // Also clean up a previously persisted file, if any.
      if (store.recordingUri) {
        await FileSystem.deleteAsync(store.recordingUri, { idempotent: true });
      }
    } catch (err) {
      console.warn('[capture] discardRecording cleanup failed:', err);
    } finally {
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      store.reset();
      setError(null);
    }
  }, [recorder, store]);

  return {
    isRecording: store.isRecording,
    isPaused: store.isPaused,
    hasRecorded: store.hasRecorded,
    recordingUri: store.recordingUri,
    permissionStatus,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    finishRecording,
    discardRecording,
  };
}
