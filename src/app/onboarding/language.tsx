import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { FONT_REGULAR, FONT_BOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { type LanguageCode } from '@/constants/languages';
import { useAppStore } from '@/stores/app.store';
import i18n from '@/constants/i18n';
import { upsertAppPrefs } from '@/db/queries/app-prefs';

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string; sublabel: string }[] = [
  { code: 'hi', label: 'हिंदी', sublabel: 'hindi' },
  { code: 'gu', label: 'ગુજરાતી', sublabel: 'gujarati' },
  { code: 'en', label: 'English', sublabel: 'english' },
];

export default function LanguageSelectionScreen() {
  const theme = useTheme();
  const store = useAppStore();

  const handleSelect = useCallback(
    async (code: LanguageCode) => {
      try {
        await i18n.changeLanguage(code);
      } catch (err) {
        console.warn('[language] i18n.changeLanguage failed, proceeding anyway:', err);
      }
      store.setLanguage(code);
      store.setOnboardingStep('welcome');
      void upsertAppPrefs({ language: code, onboarding_step: 'welcome' });
      router.replace('/onboarding/welcome');
    },
    [store],
  );

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.options}>
        {LANGUAGE_OPTIONS.map(({ code, label, sublabel }) => (
          <Pressable
            key={code}
            style={({ pressed }) => [
              styles.option,
              { borderColor: theme.cta, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => void handleSelect(code)}
            accessibilityLabel={label}
            accessibilityRole="button"
          >
            <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
            <Text style={[styles.optionSublabel, { color: theme.text + '60' }]}>{sublabel}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  options: {
    gap: Spacing.md,
  },
  option: {
    borderWidth: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  optionLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 24,
  },
  optionSublabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
