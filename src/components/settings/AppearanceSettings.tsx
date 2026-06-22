import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore, type ThemePreference } from '@/stores/app.store';
import { upsertAppPrefs } from '@/db/queries/app-prefs';

const OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
];

export function AppearanceSettings() {
  const { t } = useTranslation();
  const theme = useTheme();
  const themePreference = useAppStore((s) => s.theme_preference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);

  const handleSelect = useCallback(
    (value: ThemePreference) => {
      if (value === themePreference) return;
      setThemePreference(value); // instant UI update
      void upsertAppPrefs({ theme_preference: value }).then(({ error }) => {
        if (error) console.warn('[AppearanceSettings] upsertAppPrefs failed:', error);
      });
    },
    [themePreference, setThemePreference],
  );

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('settings.appearance')}</Text>

      <View style={[styles.segment, { borderColor: theme.cta }]}>
        {OPTIONS.map((option, index) => {
          const selected = option.value === themePreference;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.segmentItem,
                { borderColor: theme.cta },
                index === 0 && styles.segmentItemFirst,
                selected && { backgroundColor: theme.cta },
              ]}
              onPress={() => handleSelect(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: selected ? theme.background : theme.cta },
                ]}
              >
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderLeftWidth: 1,
  },
  segmentItemFirst: {
    borderLeftWidth: 0,
  },
  segmentLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
