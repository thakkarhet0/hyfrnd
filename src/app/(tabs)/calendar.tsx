import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Typography, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';

type ViewMode = 'today' | 'month';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [view, setView] = useState<ViewMode>('today');

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleButton,
            { borderColor: theme.text + '40' },
            view === 'today' && { backgroundColor: theme.highlight, borderColor: theme.highlight },
          ]}
          onPress={() => setView('today')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleLabel, { color: view === 'today' ? INK : theme.text }]}>
            {t('followUps.today')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            { borderColor: theme.text + '40' },
            view === 'month' && { backgroundColor: theme.highlight, borderColor: theme.highlight },
          ]}
          onPress={() => setView('month')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleLabel, { color: view === 'month' ? INK : theme.text }]}>
            {t('followUps.month')}
          </Text>
        </Pressable>
      </View>

      {/* Task 4 replaces this with the real today view */}
      {view === 'today' && <View style={styles.placeholder} />}
      {/* Task 5 replaces this with the real month view */}
      {view === 'month' && <View style={styles.placeholder} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleLabel: {
    ...Typography.label,
  },
  placeholder: {
    flex: 1,
  },
});
