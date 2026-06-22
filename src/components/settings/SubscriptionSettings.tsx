import { useCallback } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { getContactCount } from '@/db/queries/contacts';

const FREE_LIMIT = 10;

const MANAGE_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : `https://play.google.com/store/account/subscriptions?sku=godsplan_unlimited_monthly&package=com.godsplan.app`;

export function SubscriptionSettings() {
  const theme = useTheme();
  const { plan_tier, contact_count, setContactCount } = useSubscriptionStore();

  useFocusEffect(
    useCallback(() => {
      getContactCount().then(({ data, error }) => {
        if (!error) setContactCount(data);
      });
    }, [setContactCount]),
  );

  const handleManage = () => {
    Linking.openURL(MANAGE_URL).catch(() => {
      Alert.alert('', 'could not open subscription management');
    });
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>subscription</Text>

      <View style={[styles.row, { borderColor: theme.text + '20' }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          {plan_tier === 'unlimited' ? 'unlimited plan' : 'free plan'}
        </Text>
        {plan_tier === 'free' && (
          <Text style={[styles.value, { color: theme.text + '80' }]}>
            {contact_count}/{FREE_LIMIT} contacts
          </Text>
        )}
        {plan_tier === 'unlimited' && (
          <Text style={[styles.value, { color: theme.text + '80' }]}>
            ₹400/month · renews automatically
          </Text>
        )}
      </View>

      {plan_tier === 'free' ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: theme.cta, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => router.push('/paywall')}
          accessibilityRole="button"
          accessibilityLabel="upgrade to unlimited plan"
        >
          <Text style={[styles.actionLabel, { color: theme.background }]}>upgrade</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { borderWidth: 1, borderColor: theme.cta, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleManage}
          accessibilityRole="button"
          accessibilityLabel="manage subscription in app store"
        >
          <Text style={[styles.actionLabel, { color: theme.cta }]}>manage subscription</Text>
        </Pressable>
      )}
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
  row: {
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  label: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  value: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  actionBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    textTransform: 'lowercase',
  },
});
