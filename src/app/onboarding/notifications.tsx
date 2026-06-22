import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import * as ExpoNotifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

import { FONT_REGULAR, FONT_BOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/stores/app.store';
import { upsertAppPrefs } from '@/db/queries/app-prefs';
import { scheduleDailyNudges } from '@/services/notifications.service';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const store = useAppStore();

  const [loading, setLoading] = useState(false);

  const handleContinue = useCallback(async () => {
    setLoading(true);

    // Notification permission — denial is graceful
    const { status } = await ExpoNotifications.requestPermissionsAsync().catch(() => ({ status: 'denied' as const }));

    if (status === 'granted') {
      await scheduleDailyNudges({
        morning: t('notifications.morning'),
        afternoon: t('notifications.afternoon'),
        evening: t('notifications.evening'),
      }).catch((err) => console.warn('[notifications] scheduleDailyNudges failed:', err));
    }

    // STT consent is collected at the capture screen (SttConsentGate), before any audio
    // is recorded — not here, where it would run after the first capture.

    // Persist onboarding completion — must succeed before navigation
    const { error: prefsErr } = await upsertAppPrefs({
      onboarding_step: 'complete',
      onboarding_complete: true,
    });
    if (prefsErr) {
      console.warn('[notifications] app_prefs upsert failed:', prefsErr);
      // Non-fatal: proceed anyway; next launch may replay onboarding if DB write failed
    }

    store.setOnboardingComplete(true);
    store.setOnboardingStep('complete');
    router.replace('/(tabs)/capture');
  }, [store, t]);

  return (
    <Screen style={{ backgroundColor: theme.background }} edges={['top', 'bottom']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Notification explanation */}
      <Text style={[styles.section, { color: theme.text }]}>
        {t('onboarding.notificationsExplain')}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.cta, opacity: loading || pressed ? 0.8 : 1 },
        ]}
        onPress={() => void handleContinue()}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text style={[styles.ctaText, { color: theme.background }]}>
          {loading ? '…' : t('onboarding.consentProceed')}
        </Text>
      </Pressable>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    paddingBottom: 48,
    flexGrow: 1,
    justifyContent: 'center',
  },
  section: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    lineHeight: 32,
    textTransform: 'lowercase',
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
