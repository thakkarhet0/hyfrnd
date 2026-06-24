import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FONT_REGULAR, FONT_BOLD, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/stores/app.store';
import { upsertAppPrefs } from '@/db/queries/app-prefs';
import { requestContactsPermission } from '@/services/contacts-sync.service';

export default function ContactsOnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const store = useAppStore();

  const [loading, setLoading] = useState(false);

  const goNext = useCallback(() => {
    store.setOnboardingStep('notifications');
    void upsertAppPrefs({ onboarding_step: 'notifications' });
    router.replace('/onboarding/notifications');
  }, [store]);

  const handleAllow = useCallback(async () => {
    setLoading(true);
    // Permission denial is graceful — the Contacts tab still works and can
    // re-prompt / deep-link to Settings later.
    await requestContactsPermission();
    goNext();
  }, [goNext]);

  return (
    <Screen
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.section, { color: theme.text }]}>
          {t('onboarding.contactsExplain')}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: theme.highlight, opacity: loading || pressed ? 0.8 : 1 },
          ]}
          onPress={() => void handleAllow()}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaText, { color: INK }]}>
            {loading ? '…' : t('onboarding.contactsAllow')}
          </Text>
        </Pressable>

        <Pressable
          style={styles.skip}
          onPress={goNext}
          disabled={loading}
          accessibilityRole="button"
        >
          <Text style={[styles.skipText, { color: theme.text + '99' }]}>
            {t('onboarding.contactsSkip')}
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
  skip: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
