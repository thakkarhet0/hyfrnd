import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Network from 'expo-network';

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing, INK, MetalColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCaptureFlow } from '@/hooks/use-capture-flow';
import { useQueueProcessor } from '@/hooks/use-queue-processor';
import { useCaptureStore } from '@/stores/capture.store';
import { RecordButton } from '@/components/capture/RecordButton';
import { ProcessingScreen } from '@/components/capture/ProcessingScreen';
import { SttConsentGate } from '@/components/capture/SttConsentGate';
import { CaptureScreenBackground } from '@/components/capture/CaptureScreenBackground';
import { insertMemo, updateMemoTranscript, updateMemoStatus } from '@/db/queries/memos';
import { extractFromTranscript } from '@/services/extraction.service';

export default function OnboardingCaptureScreen() {
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
  } = useCaptureFlow();
  const {
    memoId,
    isProcessing,
    hasProcessingError,
    isExtractionComplete,
    extractedName,
    extractedContextPoints,
  } = useCaptureStore();
  const { tryDrainIfConnected } = useQueueProcessor();
  const store = useCaptureStore();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [typedText, setTypedText] = useState('');
  const [isTypedProcessing, setIsTypedProcessing] = useState(false);
  const isTypedProcessingRef = useRef(false);

  useEffect(() => {
    Network.getNetworkStateAsync()
      .then((s) => setIsConnected(s.isInternetReachable ?? false))
      .catch(() => setIsConnected(false));
  }, []);

  // Mirror capture.tsx: navigate when extraction completes
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

  const handleToggleRecord = () => {
    if (isRecording) {
      pauseRecording();
    } else if (isPaused) {
      resumeRecording();
    } else {
      void startRecording();
    }
  };

  const handleConfirm = () => {
    void (async () => {
      await finishRecording();
      void tryDrainIfConnected();
    })();
  };

  const handleTypedSubmit = useCallback(async () => {
    const text = typedText.trim();
    if (!text || isTypedProcessingRef.current) return;
    isTypedProcessingRef.current = true;
    setIsTypedProcessing(true);
    try {
      const { data: newMemoId, error: memoErr } = await insertMemo({ audioPath: 'typed-entry' });
      if (!newMemoId || memoErr) return;
      await updateMemoTranscript(newMemoId, text);
      await updateMemoStatus(newMemoId, 'extracted');
      store.setMemoId(newMemoId);
      store.setIsProcessing(true);
      const { data: extracted } = await extractFromTranscript(newMemoId);
      store.setExtractedName(extracted?.name ?? null);
      store.setExtractedContextPoints(extracted?.context_points ?? null);
      store.setExtractedFollowUpDate(extracted?.follow_up_date ?? null);
      store.setExtractedFollowUpIntent(extracted?.follow_up_intent ?? null);
      store.setIsProcessing(false);
      store.setIsExtractionComplete(true);
    } catch {
      store.setIsProcessing(false);
      store.setHasProcessingError(true);
    } finally {
      isTypedProcessingRef.current = false;
      setIsTypedProcessing(false);
    }
  }, [typedText, store]);

  // Processing state (STT + extraction running)
  if (isProcessing && memoId) {
    return (
      <CaptureScreenBackground style={styles.container} edges={['top', 'bottom']}>
        <ProcessingScreen memoId={memoId} isConnected={isConnected ?? false} />
      </CaptureScreenBackground>
    );
  }

  // Error state
  if (hasProcessingError && !isProcessing && memoId) {
    return (
      <CaptureScreenBackground style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={[styles.hint, { color: MetalColors.text }]}>{t('capture.processingFailed')}</Text>
          <Pressable
            onPress={() => {
              store.setHasProcessingError(false);
              store.setIsProcessing(true);
              void tryDrainIfConnected();
            }}
            style={styles.retryButton}
          >
            <Text style={[styles.retryLabel, { color: MetalColors.cta }]}>
              {t('capture.retryProcessing')}
            </Text>
          </Pressable>
        </View>
      </CaptureScreenBackground>
    );
  }

  // Typed fallback: mic permission denied
  if (permissionStatus === 'denied') {
    return (
      <CaptureScreenBackground style={styles.container} edges={['top', 'bottom']}>
        <Text style={[styles.prompt, { color: MetalColors.text }]}>
          {t('onboarding.micDeniedFallback')}
        </Text>
        <TextInput
          style={[styles.typedInput, { color: MetalColors.text, borderBottomColor: MetalColors.cta }]}
          value={typedText}
          onChangeText={setTypedText}
          placeholder={t('onboarding.typedFallbackPlaceholder')}
          placeholderTextColor={MetalColors.text + '60'}
          multiline
          autoFocus
          accessibilityLabel={t('onboarding.typedFallbackPlaceholder')}
        />
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: theme.highlight,
              opacity: isTypedProcessing || pressed || !typedText.trim() ? 0.6 : 1,
            },
          ]}
          onPress={() => void handleTypedSubmit()}
          disabled={isTypedProcessing || !typedText.trim()}
          accessibilityRole="button"
        >
          {isTypedProcessing ? (
            <ActivityIndicator color={INK} />
          ) : (
            <Text style={[styles.ctaText, { color: INK }]}>
              {t('onboarding.typedFallbackCta')}
            </Text>
          )}
        </Pressable>
      </CaptureScreenBackground>
    );
  }

  // Default: record state (gated behind STT consent — audio must not be sent before consent)
  return (
    <CaptureScreenBackground style={styles.container} edges={['top', 'bottom']}>
      <SttConsentGate>
      <Text style={[styles.prompt, { color: MetalColors.text }]}>
        {t('onboarding.capturePrompt')}
      </Text>

      {permissionStatus === 'undetermined' && (
        <Text style={[styles.micExplain, { color: MetalColors.text + '80' }]}>
          {t('onboarding.micExplain')}
        </Text>
      )}

      <View style={styles.center}>
        <RecordButton isRecording={isRecording} onPress={handleToggleRecord} />

        {isRecording && (
          <Text style={[styles.hint, { color: MetalColors.text }]}>{t('capture.tapToStop')}</Text>
        )}

        {isPaused && (
          <>
            <Text style={[styles.hint, { color: MetalColors.text + '99' }]}>
              {t('capture.tapToContinue')}
            </Text>
            <Pressable onPress={() => void discardRecording()} style={styles.reRecordButton}>
              <Text style={[styles.reRecordLabel, { color: MetalColors.cta }]}>
                {t('capture.reRecord')}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {isPaused && (
        <Pressable
          style={[styles.cta, { backgroundColor: theme.highlight }]}
          onPress={handleConfirm}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, { color: INK }]}>
            {t('common.confirm')}
          </Text>
        </Pressable>
      )}
      </SttConsentGate>
    </CaptureScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  prompt: {
    fontFamily: FONT_BOLD,
    fontSize: 24,
    lineHeight: 34,
    textTransform: 'lowercase',
  },
  micExplain: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  hint: {
    ...Typography.body,
  },
  reRecordButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  reRecordLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  typedInput: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
    borderBottomWidth: 1,
    paddingBottom: 8,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cta: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    textTransform: 'lowercase',
  },
});
