import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { getAllPendingFollowUps, type PendingFollowUp } from '@/db/queries/follow-ups';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ReEngageScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [topFollowUp, setTopFollowUp] = useState<PendingFollowUp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPendingFollowUps().then(({ data }) => {
      if (!data || data.length === 0) {
        setTopFollowUp(null);
        return;
      }
      const now = Date.now();
      const future = data.filter((fu) => fu.due_date >= now);
      setTopFollowUp(future.length > 0 ? future[0] : data[0]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Screen style={[styles.container, styles.centered, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <ActivityIndicator color={theme.cta} />
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Text style={[styles.heading, { color: theme.text }]}>
        {t('reEngage.heading')}
      </Text>

      {topFollowUp ? (
        <Pressable
          style={[styles.followUpCard, { borderColor: theme.cta + '40' }]}
          onPress={() => router.replace(`/contact/${topFollowUp.contact_id}`)}
          accessibilityRole="button"
        >
          <Text style={[styles.cardName, { color: theme.cta }]}>{topFollowUp.contact_name}</Text>
          <Text style={[styles.cardDate, { color: theme.text + '80' }]}>
            {formatDate(topFollowUp.due_date)}
          </Text>
          {topFollowUp.context_snapshot ? (
            <Text style={[styles.cardSnapshot, { color: theme.text + '60' }]} numberOfLines={3}>
              {topFollowUp.context_snapshot}
            </Text>
          ) : null}
        </Pressable>
      ) : (
        <Text style={[styles.body, { color: theme.text + '80' }]}>
          {t('reEngage.noFollowUps')}
        </Text>
      )}

      <Pressable
        style={[styles.captureBtn, { backgroundColor: theme.cta }]}
        onPress={() => router.replace('/(tabs)/capture')}
        accessibilityRole="button"
      >
        <Text style={[styles.captureBtnText, { color: theme.background }]}>
          {t('reEngage.capture')}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace('/(tabs)/contacts')}
        style={styles.dismissBtn}
        accessibilityRole="button"
      >
        <Text style={[styles.dismissText, { color: theme.text + '60' }]}>
          {t('reEngage.dismiss')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  centered: { alignItems: 'center' },
  heading: { ...Typography.heading, textAlign: 'center' },
  body: { ...Typography.body, textAlign: 'center' },
  followUpCard: {
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  cardName: { fontFamily: FONT_BOLD, fontSize: 20, textTransform: 'lowercase' },
  cardDate: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  cardSnapshot: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  captureBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  captureBtnText: { fontFamily: FONT_REGULAR, fontSize: 18, textTransform: 'lowercase' },
  dismissBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  dismissText: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
});
