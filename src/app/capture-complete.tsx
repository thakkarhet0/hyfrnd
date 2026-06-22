import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useCaptureStore } from '@/stores/capture.store';
import { useAppStore } from '@/stores/app.store';
import { upsertAppPrefs } from '@/db/queries/app-prefs';
import { insertFollowUp } from '@/db/queries/follow-ups';
import { scheduleFollowUpNotification } from '@/services/notifications.service';
import { track, ANALYTICS_EVENTS } from '@/services/analytics.service';

export default function CaptureCompleteScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    extractedName,
    extractedFollowUpDate,
    extractedContextPoints,
    memoId,
    linkedContactId,
    isNewContact,
    hadMissingFields,
    reset,
  } = useCaptureStore();
  const language = useAppStore((s) => s.language);
  const onboarding_step = useAppStore((s) => s.onboarding_step);
  const appStore = useAppStore();

  const displayName = extractedName ?? '';
  const hasFollowUp = Boolean(extractedFollowUpDate);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navigatedRef = useRef(false);

  // Single navigation path shared by the auto-redirect timer and the tap-to-skip
  // handler; guarded so the two can't both fire.
  const goNext = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (onboarding_step === 'first_capture') {
      router.replace('/onboarding/notifications');
    } else {
      router.replace('/(tabs)/contacts');
    }
    reset();
  }, [onboarding_step, reset]);

  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      if (linkedContactId && memoId && extractedFollowUpDate) {
        const dueDate = new Date(extractedFollowUpDate).getTime();
        if (!isNaN(dueDate)) {
          const contextSnapshot = extractedContextPoints ? extractedContextPoints.join('; ') : null;
          const { data: followUpId, error: followUpError } = await insertFollowUp({
            contactId: linkedContactId,
            memoId,
            dueDate,
            contextSnapshot,
          });
          if (followUpError) {
            console.warn('[CaptureComplete] insertFollowUp failed:', followUpError.message);
          } else if (followUpId) {
            const { error: notifError } = await scheduleFollowUpNotification(
              followUpId,
              linkedContactId,
              displayName,
              dueDate,
              contextSnapshot,
            );
            if (notifError) console.warn('[CaptureComplete] scheduleFollowUpNotification failed:', notifError);
          }
        }
      }

      track(ANALYTICS_EVENTS.CAPTURE_COMPLETE, {
        language,
        had_missing_fields: hadMissingFields,
        new_contact: isNewContact,
      });

      if (cancelled) return;

      if (onboarding_step === 'first_capture') {
        const { error: prefsErr } = await upsertAppPrefs({ onboarding_step: 'notifications' });
        if (prefsErr) console.warn('[CaptureComplete] app_prefs onboarding upsert failed:', prefsErr);
        else appStore.setOnboardingStep('notifications');
        if (cancelled) return;
      }

      timerRef.current = setTimeout(goNext, 2000);
    };

    void finalize();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Pressable style={styles.tapArea} onPress={goNext} accessibilityRole="button">
        <Text style={[styles.message, { color: theme.text }]}>
          {hasFollowUp
            ? t('extraction.savedFollowUp', { name: displayName, date: extractedFollowUpDate })
            : t('extraction.savedNoFollowUp', { name: displayName })}
        </Text>
        <Text style={[styles.tapHint, { color: theme.text + '80' }]}>
          {t('extraction.tapToContinue')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tapArea: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  message: {
    ...Typography.heading,
    textAlign: 'center',
  },
  tapHint: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
