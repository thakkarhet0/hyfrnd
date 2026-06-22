import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const GRIEVANCE_EMAIL = 'grievance@godsplan.app';
const PRIVACY_POLICY_URL = 'https://godsplan.app/privacy';

export function LegalSettings() {
  const { t } = useTranslation();
  const theme = useTheme();

  const version = Constants.expoConfig?.version ?? '—';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    String(Constants.expoConfig?.android?.versionCode ?? '—');

  const handleEmailPress = () => {
    Linking.openURL(`mailto:${GRIEVANCE_EMAIL}`).catch(() => {
      Alert.alert('', 'no email app found — contact grievance@godsplan.app');
    });
  };

  const handlePrivacyPress = () => {
    WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL).catch(() => {
      Alert.alert('', 'could not open browser');
    });
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('legal.title')}</Text>

      <Pressable
        onPress={handleEmailPress}
        style={({ pressed }) => [
          styles.row,
          { borderColor: theme.text + '20', opacity: pressed ? 0.6 : 1 },
        ]}
        accessibilityRole="link"
      >
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.grievanceOfficer')}</Text>
        <Text style={[styles.rowValue, { color: theme.cta }]}>{GRIEVANCE_EMAIL}</Text>
      </Pressable>

      <Pressable
        onPress={handlePrivacyPress}
        style={({ pressed }) => [
          styles.row,
          { borderColor: theme.text + '20', opacity: pressed ? 0.6 : 1 },
        ]}
        accessibilityRole="link"
      >
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.privacyPolicy')}</Text>
        <Text style={[styles.rowValue, { color: theme.cta }]}>{t('legal.privacyPolicyLink')}</Text>
      </Pressable>

      <View style={[styles.row, { borderColor: theme.text + '20' }]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.version')}</Text>
        <Text style={[styles.versionValue, { color: theme.text + '80' }]}>{`${version} (${buildNumber})`}</Text>
      </View>
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
  rowLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  rowValue: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  versionValue: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
  },
});
