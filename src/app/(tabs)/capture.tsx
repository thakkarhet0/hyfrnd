import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Network from 'expo-network';

import { Typography } from '@/constants/theme';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/hooks/use-theme';
import { useCaptureFlow } from '@/hooks/use-capture-flow';
import { useQueueProcessor } from '@/hooks/use-queue-processor';
import { useCaptureStore } from '@/stores/capture.store';
import { requeueFailedItems } from '@/db/queries/queue';
import { RecordButton } from '@/components/capture/RecordButton';
import { ProcessingScreen } from '@/components/capture/ProcessingScreen';
import { SttConsentGate } from '@/components/capture/SttConsentGate';

export default function CaptureScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    isRecording,
    isPaused,
    permissionStatus,
    startRecording,
    pauseRecording,
    resumeRecording,
    finishRecording,
    discardRecording,
    error,
  } = useCaptureFlow();
  const {
    memoId,
    isProcessing,
    hasProcessingError,
    processingError,
    isExtractionComplete,
    extractedName,
    extractedContextPoints,
  } = useCaptureStore();
  const { tryDrainIfConnected } = useQueueProcessor();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const store = useCaptureStore();

  useEffect(() => {
    Network.getNetworkStateAsync()
      .then((s) => setIsConnected(s.isInternetReachable ?? false))
      .catch(() => setIsConnected(false));
  }, []);

  useEffect(() => {
    if (!isExtractionComplete) return;
    store.setIsExtractionComplete(false);
    const hasMissingFields = extractedName === null || extractedContextPoints === null;
    store.setHadMissingFields(hasMissingFields);
    if (hasMissingFields) {
      router.push('/missing-field');
    } else {
      router.push('/extraction-review');
    }
  }, [isExtractionComplete, extractedName, extractedContextPoints, store]);

  // Record button: start → pause → resume(continue). Burst/pop fire on every tap.
  const handleRecordPress = () => {
    if (isRecording) {
      pauseRecording();
    } else if (isPaused) {
      resumeRecording();
    } else {
      void startRecording();
    }
  };

  // "Done": finalize, persist, and kick off a single drain → processing screen.
  const handleDone = () => {
    void (async () => {
      await finishRecording();
      void tryDrainIfConnected();
    })();
  };

  if (hasProcessingError && !isProcessing && memoId) {
    return (
      <Screen style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <Text style={[styles.hint, { color: theme.text }]}>{t('capture.processingFailed')}</Text>
          {processingError && (
            <Text style={[styles.reRecordLabel, { color: 'red', textAlign: 'center' }]}>{processingError}</Text>
          )}
          <Pressable
            onPress={() => {
              void (async () => {
                store.setProcessingError(null);
                store.setHasProcessingError(false);
                // Reset the failed queue item back to 'pending' so the processor will pick it up;
                // otherwise drainQueue finds nothing and the UI hangs on "Processing".
                await requeueFailedItems();
                store.setIsProcessing(true);
                await tryDrainIfConnected();
              })();
            }}
            style={styles.reRecordButton}
          >
            <Text style={[styles.reRecordLabel, { color: theme.cta }]}>
              {t('capture.retryProcessing')}
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  if (isProcessing && memoId) {
    return (
      <Screen style={[styles.container, { backgroundColor: theme.background }]}>
        <ProcessingScreen memoId={memoId} isConnected={isConnected ?? false} />
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      <SttConsentGate>
        <View style={styles.center}>
          <RecordButton isRecording={isRecording} onPress={handleRecordPress} />

          {/* Idle / recording hint */}
          {!isRecording && !isPaused && (
            <Text style={[styles.hint, { color: theme.text }]}>
              {permissionStatus === 'denied'
                ? t('capture.micPermissionNeeded')
                : t('capture.recordButton')}
            </Text>
          )}
          {isRecording && (
            <Text style={[styles.hint, { color: theme.text }]}>{t('capture.tapToStop')}</Text>
          )}

          {/* Paused: continue by tapping the mic, or choose delete / done */}
          {isPaused && (
            <View style={styles.pausedBlock}>
              <Text style={[styles.hint, { color: theme.text + '99' }]}>
                {t('capture.tapToContinue')}
              </Text>
              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => void discardRecording()}
                  style={[styles.actionButton, styles.deleteButton, { borderColor: theme.text }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('capture.delete')}
                >
                  <Text style={[styles.actionLabel, { color: theme.text }]}>
                    {t('capture.delete')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: theme.cta, borderColor: theme.cta, opacity: pressed ? 0.85 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('capture.done')}
                >
                  <Text style={[styles.actionLabel, { color: theme.background }]}>
                    {t('capture.done')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Surface capture/DB errors instead of failing silently */}
          {error && <Text style={[styles.hint, { color: 'red' }]}>{error}</Text>}
        </View>
      </SttConsentGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  hint: {
    ...Typography.body,
  },
  reRecordButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 0,
  },
  reRecordLabel: {
    ...Typography.label,
  },
  pausedBlock: {
    alignItems: 'center',
    gap: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  // Pixel-themed: flat, chunky-bordered squares.
  actionButton: {
    minWidth: 120,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 2,
  },
  deleteButton: {
    backgroundColor: 'transparent',
  },
  actionLabel: {
    ...Typography.label,
  },
});
