import { useCallback, useMemo, useState } from 'react';
import { FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, INK, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import {
  getFollowUpsForToday,
  getFollowUpsForMonth,
  type FollowUpsForToday,
  type PendingFollowUp,
} from '@/db/queries/follow-ups';

type ViewMode = 'today' | 'month';

function formatDayChip(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDayHeader(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function formatMonthHeader(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function startOfMonth(year: number, month: number): number {
  return new Date(year, month, 1, 0, 0, 0, 0).getTime();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface DayGroup {
  key: string;
  due_date: number;
  items: PendingFollowUp[];
}

function groupByDay(items: PendingFollowUp[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const item of items) {
    const key = dayKey(item.due_date);
    const existing = map.get(key);
    if (existing) existing.items.push(item);
    else map.set(key, { key, due_date: item.due_date, items: [item] });
  }
  return Array.from(map.values());
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

  const now = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [monthItems, setMonthItems] = useState<PendingFollowUp[]>([]);

  const loadToday = useCallback(async () => {
    const { data } = await getFollowUpsForToday();
    setTodayData(data ?? { overdue: [], today: [] });
  }, []);

  const loadMonth = useCallback(async (year: number, month: number) => {
    const monthStart = startOfMonth(year, month);
    const monthEndExclusive = startOfMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
    const { data } = await getFollowUpsForMonth(monthStart, monthEndExclusive);
    setMonthItems(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadToday();
      void loadMonth(monthCursor.year, monthCursor.month);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadToday, loadMonth, monthCursor.year, monthCursor.month]),
  );

  const isCurrentMonth = monthCursor.year === now.getFullYear() && monthCursor.month === now.getMonth();

  const goToMonth = useCallback(
    (direction: 1 | -1) => {
      setMonthCursor((prev) => {
        if (direction === -1 && prev.year === now.getFullYear() && prev.month === now.getMonth()) {
          return prev;
        }
        let { year, month } = prev;
        month += direction;
        if (month < 0) {
          month = 11;
          year -= 1;
        } else if (month > 11) {
          month = 0;
          year += 1;
        }
        return { year, month };
      });
    },
    [now],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx < -40) goToMonth(1);
          else if (gesture.dx > 40) goToMonth(-1);
        },
      }),
    [goToMonth],
  );

  const dayGroups = useMemo(() => groupByDay(monthItems), [monthItems]);

  const todayEntries = buildTodayEntries(todayData, t('followUps.overdue'), t('followUps.today'));
  const hasTodayData = todayEntries.length > 0;

  return (
    <Screen style={styles.container}>
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
        <>
          <View style={styles.monthHeader} {...panResponder.panHandlers}>
            <Pressable
              onPress={() => goToMonth(-1)}
              disabled={isCurrentMonth}
              accessibilityRole="button"
              accessibilityLabel="previous month"
              hitSlop={12}
            >
              <Text style={[styles.monthArrow, { color: isCurrentMonth ? theme.text + '30' : theme.text }]}>
                ‹
              </Text>
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.text }]}>
              {formatMonthHeader(monthCursor.year, monthCursor.month)}
            </Text>
            <Pressable
              onPress={() => goToMonth(1)}
              accessibilityRole="button"
              accessibilityLabel="next month"
              hitSlop={12}
            >
              <Text style={[styles.monthArrow, { color: theme.text }]}>›</Text>
            </Pressable>
          </View>

          {dayGroups.length > 0 ? (
            <FlatList
              data={dayGroups}
              keyExtractor={(group) => group.key}
              contentContainerStyle={styles.list}
              renderItem={({ item: group }) => (
                <View>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>
                    {formatDayHeader(group.due_date)}
                  </Text>
                  {group.items.map((item) => (
                    <FollowUpRow key={item.id} item={item} theme={theme} />
                  ))}
                </View>
              )}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>
                {t('followUps.emptyMonth')}
              </Text>
            </View>
          )}
        </>
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  monthArrow: { fontFamily: FONT_BOLD, fontSize: 24, paddingHorizontal: Spacing.md },
  monthLabel: { ...Typography.subheading },
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
