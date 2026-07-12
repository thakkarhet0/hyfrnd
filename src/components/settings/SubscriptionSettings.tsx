import { useCallback } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { FONT_BOLD, FONT_REGULAR, Spacing, INK } from '@/constants/theme';
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

      <View style={[styles.cardContainer, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        <View style={styles.statusRow}>
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
          <View style={styles.btnContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: theme.highlight,
                  borderColor: theme.text,
                  transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
                },
              ]}
              onPress={() => router.push('/paywall')}
              accessibilityRole="button"
              accessibilityLabel="upgrade to unlimited plan"
            >
              <Text style={[styles.actionLabel, { color: INK }]}>upgrade</Text>
            </Pressable>
            <View style={[styles.btnShadow, { backgroundColor: theme.highlight + '20', borderColor: theme.cardBorder }]} />
          </View>
        ) : (
          <View style={styles.btnContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.cta,
                  transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
                },
              ]}
              onPress={handleManage}
              accessibilityRole="button"
              accessibilityLabel="manage subscription in app store"
            >
              <Text style={[styles.actionLabel, { color: theme.cta }]}>manage subscription</Text>
            </Pressable>
            <View style={[styles.btnShadow, { backgroundColor: theme.cta + '20', borderColor: theme.cardBorder }]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  cardContainer: {
    borderWidth: 1.5,
    borderColor: '#3a3a3e',
    backgroundColor: '#222225',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statusRow: {
    gap: 4,
  },
  label: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    textTransform: 'lowercase',
  },
  value: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  btnContainer: {
    height: 52,
    position: 'relative',
  },
  btnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderWidth: 1.5,
    borderColor: '#3a3a3e',
    zIndex: 0,
  },
  actionBtn: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  actionLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
