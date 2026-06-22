import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAppPrefs, upsertAppPrefs } from '@/db/queries/app-prefs';
import {
  clearStoredTokens,
  getStoredAccessToken,
  storeTokens,
  revokeToken,
  runBackup,
} from '@/services/backup.service';

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;

export function BackupSettings() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [backupEnabled, setBackupEnabled] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [lastBackupError, setLastBackupError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: extra?.googleIosClientId,
    androidClientId: extra?.googleAndroidClientId,
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  });

  useEffect(() => {
    getAppPrefs().then(({ data, error }) => {
      if (error) {
        console.warn('[BackupSettings] getAppPrefs failed:', error);
        return;
      }
      if (data) {
        setBackupEnabled(data.backup_enabled);
        setLastBackupAt(data.last_backup_at);
        setLastBackupError(data.last_backup_error);
      }
    });
  }, []);

  useEffect(() => {
    if (!response || response.type !== 'success') return;
    const timer = setTimeout(() => {
      setIsWorking(true);
      void (async () => {
        try {
          const auth = response.authentication;
          if (!auth) throw new Error('OAuth succeeded but authentication object is missing');
          const { accessToken, refreshToken } = auth;
          await storeTokens(accessToken, refreshToken ?? undefined);
          await upsertAppPrefs({ backup_enabled: true });
          setBackupEnabled(true);
          const { error } = await runBackup(accessToken);
          if (error) {
            setLastBackupError(error);
          } else {
            setLastBackupAt(Date.now());
            setLastBackupError(null);
          }
        } finally {
          setIsWorking(false);
        }
      })();
    }, 0);
    return () => clearTimeout(timer);
  }, [response]);

  const handleEnable = useCallback(() => {
    void promptAsync();
  }, [promptAsync]);

  const handleBackupNow = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const token = await getStoredAccessToken();
      if (!token) {
        console.warn('[BackupSettings] no stored token');
        return;
      }
      const { error } = await runBackup(token);
      if (error) {
        setLastBackupError(error);
      } else {
        setLastBackupAt(Date.now());
        setLastBackupError(null);
      }
    } finally {
      setIsWorking(false);
    }
  }, [isWorking]);

  const handleDisable = useCallback(async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const token = await getStoredAccessToken();
      if (token) await revokeToken(token);
      await clearStoredTokens();
      await upsertAppPrefs({ backup_enabled: false });
      setBackupEnabled(false);
      setLastBackupAt(null);
      setLastBackupError(null);
    } finally {
      setIsWorking(false);
    }
  }, [isWorking]);

  const formattedLastBackup = lastBackupAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(lastBackupAt),
      )
    : null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('backup.title')}</Text>

      {!backupEnabled ? (
        <>
          <Text style={[styles.disclosure, { color: theme.text }]}>{t('backup.disclosure')}</Text>
          <Pressable
            onPress={handleEnable}
            disabled={!request || isWorking}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.cta,
                opacity: !request || isWorking || pressed ? 0.5 : 1,
              },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: theme.background }]}>
              {t('backup.enable')}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {formattedLastBackup ? (
            <Text style={[styles.subtitle, { color: theme.text }]}>
              {t('backup.lastBackup', { time: formattedLastBackup })}
            </Text>
          ) : null}
          {lastBackupError ? (
            <Text style={[styles.errorText]}>{t('backup.lastFailed')}</Text>
          ) : null}
          <Pressable
            onPress={() => void handleBackupNow()}
            disabled={isWorking}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.cta, opacity: isWorking || pressed ? 0.5 : 1 },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: theme.background }]}>
              {isWorking ? t('backup.syncing') : t('backup.backupNow')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleDisable()}
            disabled={isWorking}
            style={({ pressed }) => [
              styles.disableButton,
              { borderColor: theme.text, opacity: isWorking || pressed ? 0.5 : 1 },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.disableButtonText, { color: theme.text }]}>
              {t('backup.disable')}
            </Text>
          </Pressable>
        </>
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
  disclosure: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  errorText: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
    color: '#c0392b',
  },
  button: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  disableButton: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  disableButtonText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
