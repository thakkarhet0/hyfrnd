import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing } from '@/constants/theme';
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
            style={[styles.row, { borderBottomColor: theme.text + '20' }]}
            onPress={() => router.push(`/contact/${item.contact_id}`)}
            accessibilityRole="button"
          >
            <Text style={[styles.name, { color: theme.text }]}>{item.contact_name}</Text>
            <Text style={[styles.date, { color: theme.cta }]}>{formatDate(item.due_date)}</Text>
            {item.context_snapshot ? (
              <Text style={[styles.snapshot, { color: theme.text + '80' }]} numberOfLines={2}>
                {item.context_snapshot}
              </Text>
            ) : null}
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
  list: { paddingBottom: Spacing.xl },
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: 4,
  },
  name: { fontFamily: FONT_BOLD, fontSize: 18, textTransform: 'lowercase' },
  date: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  snapshot: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
});
