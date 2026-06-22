import { useCallback, useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FONT_REGULAR, FONT_BOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/stores/app.store';
import { upsertAppPrefs } from '@/db/queries/app-prefs';

const OEM_STEPS = ['batteryXiaomi', 'batteryRealme', 'batteryOppo'] as const;
const IS_ANDROID = Platform.OS === 'android';

export default function BatteryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const store = useAppStore();

  // iOS: skip this step — navigate straight to notifications
  useEffect(() => {
    if (!IS_ANDROID) {
      store.setOnboardingStep('contacts');
      void upsertAppPrefs({ onboarding_step: 'contacts' });
      router.replace('/onboarding/contacts');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = useCallback(() => {
    store.setOnboardingStep('notifications');
    void upsertAppPrefs({ onboarding_step: 'notifications' });
    router.replace('/onboarding/notifications');
  }, [store]);

  if (!IS_ANDROID) {
    return null;
  }

  return (
    <Screen style={{ backgroundColor: theme.background }} edges={['top', 'bottom']}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.text }]}>
        {t('onboarding.batteryTitle')}
      </Text>
      <Text style={[styles.body, { color: theme.text + 'CC' }]}>
        {t('onboarding.batteryBody')}
      </Text>

      <View style={styles.oemList}>
        {OEM_STEPS.map((key) => (
          <View key={key} style={[styles.oemRow, { borderColor: theme.text + '20' }]}>
            <Text style={[styles.oemText, { color: theme.text + '99' }]}>
              {t(`onboarding.${key}`)}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.cta, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={handleContinue}
        accessibilityRole="button"
      >
        <Text style={[styles.ctaText, { color: theme.background }]}>
          {t('onboarding.batteryContinue')}
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
    gap: Spacing.lg,
    paddingBottom: 48,
  },
  title: {
    fontFamily: FONT_BOLD,
    fontSize: 24,
    textTransform: 'lowercase',
  },
  body: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    lineHeight: 24,
    textTransform: 'lowercase',
  },
  oemList: {
    gap: Spacing.sm,
  },
  oemRow: {
    borderWidth: 1,
    padding: Spacing.md,
  },
  oemText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    lineHeight: 22,
    textTransform: 'lowercase',
  },
  cta: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  ctaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    textTransform: 'lowercase',
  },
});
