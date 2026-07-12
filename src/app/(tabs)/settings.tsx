import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { BackupSettings } from '@/components/settings/BackupSettings';
import { ConsentSettings } from '@/components/settings/ConsentSettings';
import { LegalSettings } from '@/components/settings/LegalSettings';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Screen style={{ backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.heading, { color: theme.text }]}>{t('settings.title')}</Text>
        <SubscriptionSettings />
        <NotificationSettings />
        <BackupSettings />
        <ConsentSettings />
        <LegalSettings />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  heading: {
    fontFamily: FONT_BOLD,
    fontSize: 28,
    textTransform: 'lowercase',
  },
});
