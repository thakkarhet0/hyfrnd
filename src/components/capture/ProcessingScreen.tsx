import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ProcessingScreenProps {
  memoId: string;
  isConnected: boolean;
}

export function ProcessingScreen({ memoId: _memoId, isConnected }: ProcessingScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.header, { color: theme.text }]}>{t('capture.processingMemo')}</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        {isConnected ? t('capture.processingOnline') : t('capture.processingOffline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  header: {
    ...Typography.body,
  },
  subtitle: {
    ...Typography.label,
    textAlign: 'center',
  },
});
