import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, INK, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import {
  getFollowUpsForToday,
  type FollowUpsForToday,
  type PendingFollowUp,
} from '@/db/queries/follow-ups';

type ViewMode = 'today' | 'month';

function formatDayChip(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function FollowUpRow({ item, theme }: { item: PendingFollowUp; theme: ThemeColors }) {
  return (
    <Pressable
      style={[styles.row, { borderColor: theme.text + '20', backgroundColor: theme.text + '06' }]}
      onPress={() => router.push(`/contact/${item.contact_id}`)}
      accessibilityRole="button"
    >
      <View style={[styles.accentBar, { backgroundColor: theme.highlight }]} />
      <View style={styles.rowContent}>
        <Text style={[styles.name, { color: theme.text }]}>{item.contact_name}</Text>
        <View style={[styles.dateChip, { backgroundColor: INK }]}>
          <Text style={[styles.dateChipText, { color: theme.highlight }]}>
            {formatDayChip(item.due_date)}
          </Text>
        </View>
        {item.context_snapshot ? (
          <Text style={[styles.snapshot, { color: theme.text + '80' }]} numberOfLines={2}>
            {item.context_snapshot}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

type TodayEntry =
  | { type: 'header'; key: string; label: string; isOverdue: boolean }
  | { type: 'row'; key: string; item: PendingFollowUp };

function buildTodayEntries(data: FollowUpsForToday, overdueLabel: string, todayLabel: string): TodayEntry[] {
  const entries: TodayEntry[] = [];
  if (data.overdue.length > 0) {
    entries.push({ type: 'header', key: 'overdue-header', label: overdueLabel, isOverdue: true });
    for (const item of data.overdue) entries.push({ type: 'row', key: item.id, item });
  }
  if (data.today.length > 0) {
    entries.push({ type: 'header', key: 'today-header', label: todayLabel, isOverdue: false });
    for (const item of data.today) entries.push({ type: 'row', key: item.id, item });
  }
  return entries;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [view, setView] = useState<ViewMode>('today');
  const [todayData, setTodayData] = useState<FollowUpsForToday>({ overdue: [], today: [] });

  const loadToday = useCallback(async () => {
    const { data } = await getFollowUpsForToday();
    setTodayData(data ?? { overdue: [], today: [] });
  }, []);

  useFocusEffect(useCallback(() => { void loadToday(); }, [loadToday]));

  const todayEntries = buildTodayEntries(todayData, t('followUps.overdue'), t('followUps.today'));
  const hasTodayData = todayEntries.length > 0;

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

      {view === 'today' ? (
        hasTodayData ? (
          <FlatList
            data={todayEntries}
            keyExtractor={(entry) => entry.key}
            contentContainerStyle={styles.list}
            renderItem={({ item: entry }) =>
              entry.type === 'header' ? (
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: entry.isOverdue ? theme.highlight : theme.text },
                  ]}
                >
                  {entry.label}
                </Text>
              ) : (
                <FollowUpRow item={entry.item} theme={theme} />
              )
            }
          />
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('followUps.emptyTitle')}</Text>
            <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>{t('followUps.emptyBody')}</Text>
          </View>
        )
      ) : (
        <View style={styles.placeholder} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  toggleLabel: { ...Typography.label },
  placeholder: { flex: 1 },
  list: { paddingBottom: Spacing.xl },
  sectionLabel: {
    ...Typography.label,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: { ...Typography.heading, textAlign: 'center' },
  emptyBody: { ...Typography.body, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  rowContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  name: { fontFamily: FONT_BOLD, fontSize: 18, textTransform: 'lowercase' },
  dateChip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  dateChipText: { fontFamily: FONT_BOLD, fontSize: 13, textTransform: 'lowercase' },
  snapshot: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
});
