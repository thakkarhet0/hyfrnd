import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { getAllPendingFollowUps, type PendingFollowUp } from '@/db/queries/follow-ups';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function FollowUpsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [followUps, setFollowUps] = useState<PendingFollowUp[]>([]);

  const load = useCallback(async () => {
    const { data } = await getAllPendingFollowUps();
    setFollowUps(data ?? []);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (followUps.length === 0) {
    return (
      <Screen style={[styles.container, styles.empty, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {t('followUps.emptyTitle')}
        </Text>
        <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>
          {t('followUps.emptyBody')}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <FlatList
        data={followUps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
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
                  {formatDate(item.due_date)}
                </Text>
              </View>
              {item.context_snapshot ? (
                <Text style={[styles.snapshot, { color: theme.text + '80' }]} numberOfLines={2}>
                  {item.context_snapshot}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyTitle: { ...Typography.heading, textAlign: 'center' },
  emptyBody: { ...Typography.body, textAlign: 'center' },
  list: { paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
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
