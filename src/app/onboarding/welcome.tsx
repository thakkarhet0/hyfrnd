import { useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FONT_REGULAR, FONT_BOLD, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/stores/app.store';
import { upsertAppPrefs } from '@/db/queries/app-prefs';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const store = useAppStore();

  const handleContinue = useCallback(() => {
    store.setOnboardingStep('first_capture');
    void upsertAppPrefs({ onboarding_step: 'first_capture' });
    router.replace('/onboarding/capture');
  }, [store]);

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Text style={[styles.headline, { color: theme.text }]}>
        {t('onboarding.welcomeHeadline')}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.highlight, opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={handleContinue}
        accessibilityRole="button"
      >
        <Text style={[styles.ctaText, { color: INK }]}>
          {t('onboarding.letsGo')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: 48,
  },
  headline: {
    fontFamily: FONT_BOLD,
    fontSize: 28,
    lineHeight: 38,
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
