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

      <View style={[styles.cardContainer, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        <Pressable
          onPress={handleEmailPress}
          style={({ pressed }) => [
            styles.row,
            pressed && { backgroundColor: theme.cardBgActive },
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
            styles.rowBorder,
            { borderTopColor: theme.divider },
            pressed && { backgroundColor: theme.cardBgActive },
          ]}
          accessibilityRole="link"
        >
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.privacyPolicy')}</Text>
          <Text style={[styles.rowValue, { color: theme.cta }]}>{t('legal.privacyPolicyLink')}</Text>
        </Pressable>

        <View style={[styles.row, styles.rowBorder, { borderTopColor: theme.divider }]}>
          <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.version')}</Text>
          <Text style={[styles.versionValue, { color: theme.text + '80' }]}>{`${version} (${buildNumber})`}</Text>
        </View>
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
  },
  row: {
    padding: Spacing.md,
    gap: 4,
  },
  rowBorder: {
    borderTopWidth: 1.5,
    borderTopColor: '#2d2d31',
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
