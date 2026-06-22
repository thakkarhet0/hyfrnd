import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';

import { updateMemoStatus } from '@/db/queries/memos';
import { getPendingQueueItems, updateQueueItemStatus } from '@/db/queries/queue';
import { processQueueItem } from '@/services/stt.service';
import { extractFromTranscript } from '@/services/extraction.service';
import { useCaptureStore } from '@/stores/capture.store';

export function useQueueProcessor() {
  const store = useCaptureStore();
  // Prevents overlapping drains (mount effect, AppState 'active', and the "done"
  // action can all fire near-simultaneously) from double-processing an item.
  const drainingRef = useRef(false);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      const { data: items } = await getPendingQueueItems();
      if (!items || items.length === 0) {
        // Nothing to process — clear the processing flag so the UI never hangs on the
        // "Processing your memo" screen (e.g. after a failed item was excluded from the pending set).
        store.setIsProcessing(false);
        return;
      }

      for (const item of items) {
        await updateQueueItemStatus(item.id, 'processing');
        const { error: sttError } = await processQueueItem(item);
        if (sttError) {
          console.error('[STT] transcription failed for memo', item.memo_id, '-', sttError.message);
          await updateQueueItemStatus(item.id, 'failed');
          await updateMemoStatus(item.memo_id, 'failed');
          store.setProcessingError(sttError.message);
          store.setHasProcessingError(true);
          store.setIsProcessing(false);
          continue;
        }

        await updateQueueItemStatus(item.id, 'completed');

        const { data: extracted, error: extractionError } = await extractFromTranscript(
          item.memo_id,
        );
        if (extractionError || !extracted) {
          console.error('[STT] extraction failed for memo', item.memo_id, '-', extractionError?.message);
          await updateMemoStatus(item.memo_id, 'failed');
          store.setProcessingError(extractionError?.message ?? 'extraction returned no data');
          store.setHasProcessingError(true);
        } else {
          store.setProcessingError(null);
          await updateMemoStatus(item.memo_id, 'extracted');
          store.setExtractedName(extracted.name);
          store.setExtractedContextPoints(extracted.context_points);
          store.setExtractedFollowUpDate(extracted.follow_up_date);
          store.setExtractedFollowUpIntent(extracted.follow_up_intent);
          store.setHasProcessingError(false);
          store.setIsExtractionComplete(true);
        }
        store.setIsProcessing(false);
      }
    } finally {
      drainingRef.current = false;
    }
  }, [store]);

  const tryDrainIfConnected = useCallback(async () => {
    const { isInternetReachable } = await Network.getNetworkStateAsync();
    if (isInternetReachable === true) {
      await drainQueue();
    }
    // null or false → queue stays pending; isProcessing remains true until drain succeeds
  }, [drainQueue]);

  useEffect(() => {
    void tryDrainIfConnected();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void tryDrainIfConnected();
      }
    });

    return () => subscription.remove();
  }, [tryDrainIfConnected]);

  return { tryDrainIfConnected };
}
