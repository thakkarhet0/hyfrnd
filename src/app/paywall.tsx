import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useCaptureStore } from '@/stores/capture.store';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { initPayments, endPayments, purchaseSubscription, restoreSubscription } from '@/services/payments.service';

export default function PaywallScreen() {
  const theme = useTheme();
  const { extractedName, reset } = useCaptureStore();
  const { setPlanTier } = useSubscriptionStore();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  // refs so BackHandler and cleanup useEffect can read current values from stale closures
  const isPurchasingRef = useRef(false);
  const isRestoringRef = useRef(false);

  const setIsPurchasingBoth = (val: boolean) => {
    isPurchasingRef.current = val;
    setIsPurchasing(val);
  };

  const setIsRestoringBoth = (val: boolean) => {
    isRestoringRef.current = val;
    setIsRestoring(val);
  };

  const handleNotNow = () => {
    router.replace('/(tabs)/contacts');
    reset();
  };

  const handleSubscribe = async () => {
    setIsPurchasingBoth(true);
    const result = await purchaseSubscription();
    setIsPurchasingBoth(false);

    if (result.success) {
      setPlanTier('unlimited');
      router.back();
    } else if (result.error) {
      Alert.alert('', result.error);
    }
    // empty error = user cancelled silently — do nothing
  };

  const handleRestore = async () => {
    setIsRestoringBoth(true);
    const result = await restoreSubscription();
    setIsRestoringBoth(false);

    if (result.found) {
      setPlanTier('unlimited');
      router.back();
    } else if (result.error) {
      Alert.alert('', result.error);
    } else {
      Alert.alert('', 'no previous purchase found');
    }
  };

  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      // block Android back during purchase or restore — must not wipe capture state mid-operation
      if (isPurchasingRef.current || isRestoringRef.current) return true;
      handleNotNow();
      return true;
    });
    return () => backSub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void initPayments().catch(() => {
      // IAP unavailable on simulator or unconfigured billing — silently ignore
    });
    return () => {
      // skip endConnection if a transaction or restore is still in flight
      if (!isPurchasingRef.current && !isRestoringRef.current) {
        void endPayments().catch(() => {});
      }
    };
  }, []);

  const contactRef = extractedName
    ? `you were about to save ${extractedName}.`
    : 'you hit the free contact limit.';

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Text style={[styles.anchor, { color: theme.text }]}>{contactRef}</Text>
        <Text style={[styles.headline, { color: theme.text }]}>
          upgrade to keep capturing.
        </Text>
        <Text style={[styles.pricing, { color: theme.cta }]}>
          ₹400/month · 7-day free trial · unlimited contacts
        </Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.btnContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: theme.highlight,
                borderColor: theme.text,
                transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
              },
            ]}
            onPress={() => void handleSubscribe()}
            disabled={isPurchasing || isRestoring}
            accessibilityRole="button"
            accessibilityLabel="subscribe for ₹400 per month with 7-day free trial"
          >
            {isPurchasing ? (
              <ActivityIndicator color={INK} />
            ) : (
              <Text style={[styles.primaryLabel, { color: INK }]}>
                start free trial
              </Text>
            )}
          </Pressable>
          <View style={[styles.btnShadow, { backgroundColor: theme.highlight + '20', borderColor: theme.cardBorder }]} />
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.btnContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.cta,
                  transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
                },
              ]}
              onPress={() => void handleRestore()}
              disabled={isPurchasing || isRestoring}
              accessibilityRole="button"
              accessibilityLabel="restore previous purchase"
            >
              {isRestoring ? (
                <ActivityIndicator color={theme.cta} />
              ) : (
                <Text style={[styles.secondaryLabel, { color: theme.cta }]}>
                  restore purchase
                </Text>
              )}
            </Pressable>
            <View style={[styles.btnShadow, { backgroundColor: theme.cta + '20', borderColor: theme.cardBorder }]} />
          </View>
        )}

        <Pressable
          style={styles.ghostBtn}
          onPress={handleNotNow}
          disabled={isPurchasing || isRestoring}
          accessibilityRole="button"
          accessibilityLabel="not now, go back to contacts"
        >
          <Text style={[styles.ghostLabel, { color: theme.text }]}>not now</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: 80,
    justifyContent: 'space-between',
  },
  top: {
    gap: Spacing.xl,
  },
  anchor: {
    ...Typography.body,
  },
  headline: {
    ...Typography.display,
  },
  pricing: {
    ...Typography.subheading,
  },
  actions: {
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  btnContainer: {
    height: 52,
    position: 'relative',
    marginBottom: Spacing.xs,
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
  primaryBtn: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  primaryLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  secondaryBtn: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  secondaryLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  ghostBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ghostLabel: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
    opacity: 0.6,
  },
});
