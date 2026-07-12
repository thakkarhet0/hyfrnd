import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, FONT_REGULAR, Spacing, INK } from '@/constants/theme';
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

      <View style={[styles.cardContainer, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
        {!backupEnabled ? (
          <Text style={[styles.disclosure, { color: theme.text }]}>{t('backup.disclosure')}</Text>
        ) : (
          <View style={styles.statusRow}>
            {formattedLastBackup ? (
              <Text style={[styles.subtitle, { color: theme.text }]}>
                {t('backup.lastBackup', { time: formattedLastBackup })}
              </Text>
            ) : null}
            {lastBackupError ? (
              <Text style={[styles.errorText]}>{t('backup.lastFailed')}</Text>
            ) : null}
          </View>
        )}
      </View>

      {!backupEnabled ? (
        <View style={styles.btnContainer}>
          <Pressable
            onPress={handleEnable}
            disabled={!request || isWorking}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.highlight,
                borderColor: theme.text,
                opacity: !request || isWorking ? 0.5 : 1,
                transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
              },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.buttonText, { color: INK }]}>
              {t('backup.enable')}
            </Text>
          </Pressable>
          <View style={[styles.btnShadow, { backgroundColor: theme.highlight + '20', borderColor: theme.cardBorder }]} />
        </View>
      ) : (
        <View style={styles.buttonGroup}>
          <View style={styles.btnContainer}>
            <Pressable
              onPress={() => void handleBackupNow()}
              disabled={isWorking}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.highlight,
                  borderColor: theme.text,
                  opacity: isWorking ? 0.5 : 1,
                  transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.buttonText, { color: INK }]}>
                {isWorking ? t('backup.syncing') : t('backup.backupNow')}
              </Text>
            </Pressable>
            <View style={[styles.btnShadow, { backgroundColor: theme.highlight + '20', borderColor: theme.cardBorder }]} />
          </View>

          <View style={styles.btnContainer}>
            <Pressable
              onPress={() => void handleDisable()}
              disabled={isWorking}
              style={({ pressed }) => [
                styles.disableButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.text,
                  opacity: isWorking ? 0.5 : 1,
                  transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={[styles.disableButtonText, { color: theme.text }]}>
                {t('backup.disable')}
              </Text>
            </Pressable>
            <View style={[styles.btnShadow, { backgroundColor: theme.text + '10', borderColor: theme.cardBorder }]} />
          </View>
        </View>
      )}
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
  buttonGroup: {
    gap: Spacing.md + 4,
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
  button: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  buttonText: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  disableButton: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  disableButtonText: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
