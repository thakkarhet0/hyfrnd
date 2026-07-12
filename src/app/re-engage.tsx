import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing, INK } from '@/constants/theme';
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
          style={({ pressed }) => [
            styles.followUpCard,
            {
              borderColor: theme.cardBorder,
              backgroundColor: theme.cardBg,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.replace(`/contact/${topFollowUp.contact_id}`)}
          accessibilityRole="button"
        >
          <Text style={[styles.cardName, { color: theme.text }]}>{topFollowUp.contact_name}</Text>
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

      <View style={styles.captureBtnContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.captureBtn,
            {
              backgroundColor: theme.highlight,
              borderColor: theme.text,
              transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
            },
          ]}
          onPress={() => router.replace('/(tabs)/capture')}
          accessibilityRole="button"
        >
          <Text style={[styles.captureBtnText, { color: INK }]}>
            {t('reEngage.capture')}
          </Text>
        </Pressable>
        <View style={[styles.captureBtnShadow, { backgroundColor: theme.highlight + '20', borderColor: theme.cardBorder }]} />
      </View>

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
    borderWidth: 1.5,
    padding: Spacing.md,
    gap: 4,
  },
  cardName: { fontFamily: FONT_BOLD, fontSize: 20, textTransform: 'lowercase' },
  cardDate: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  cardSnapshot: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  captureBtnContainer: {
    height: 52,
    position: 'relative',
  },
  captureBtnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderWidth: 1.5,
    borderColor: '#3a3a3e',
    zIndex: 0,
  },
  captureBtn: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  captureBtnText: { fontFamily: FONT_BOLD, fontSize: 16, textTransform: 'lowercase' },
  dismissBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  dismissText: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
});
