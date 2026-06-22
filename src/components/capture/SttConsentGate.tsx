import { ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_REGULAR, FONT_BOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSttConsent } from '@/hooks/use-stt-consent';

/**
 * Gates audio capture behind STT consent. Renders `children` (the recorder) only once
 * consent has been granted; otherwise shows an explanation and an enable button.
 * This guarantees consent is collected before any audio is sent for transcription.
 */
export function SttConsentGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { granted, grant } = useSttConsent();
  const [busy, setBusy] = useState(false);

  // Loading consent state — render nothing rather than flash the prompt.
  if (granted === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (granted) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.consentStt')}</Text>
      <Text style={[styles.detail, { color: theme.text + '80' }]}>
        {t('onboarding.consentSttDetail')}
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.cta, opacity: busy || pressed ? 0.8 : 1 },
        ]}
        onPress={() => {
          void (async () => {
            setBusy(true);
            await grant();
            setBusy(false);
          })();
        }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
      >
        <Text style={[styles.ctaText, { color: theme.background }]}>
          {busy ? '…' : t('onboarding.consentProceed')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  title: {
    fontFamily: FONT_BOLD,
    fontSize: 22,
    lineHeight: 32,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  detail: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  cta: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    textTransform: 'lowercase',
  },
});
