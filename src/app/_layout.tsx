import '@/polyfills/crypto'; // must run before nanoid / any crypto.getRandomValues usage

import i18n from '@/constants/i18n';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PostHogProvider } from 'posthog-react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initializeDatabase } from '@/db/index';
import { getAppPrefs, upsertAppPrefs } from '@/db/queries/app-prefs';
import { analyticsClient } from '@/services/analytics.service';
import { runBackup, getStoredAccessToken } from '@/services/backup.service';
import { setupNotificationChannel } from '@/services/notifications.service';
import { getPaperTheme } from '@/constants/paperTheme';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppStore } from '@/stores/app.store';

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;

const sentryEnabled = extra?.appEnv !== 'development' && Boolean(extra?.sentryDsn);
if (!sentryEnabled && extra?.appEnv !== 'development') {
  console.warn('[Sentry] Disabled — SENTRY_DSN is not set. Crash reporting is inactive.');
}

const PII_BREADCRUMB_PATTERNS = /\b(name|phone|email|transcript|contact|address)\b/i;

Sentry.init({
  dsn: extra?.sentryDsn ?? '',
  enabled: sentryEnabled,
  beforeSend(event) {
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        const msg = b.message ?? '';
        if (PII_BREADCRUMB_PATTERNS.test(msg)) {
          return { ...b, message: '[redacted]', data: undefined };
        }
        return { ...b, data: undefined };
      });
    }
    return event;
  },
});

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const { t } = useTranslation();
  const [fontsLoaded] = useFonts({ SpaceMono_400Regular, SpaceMono_700Bold });
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [pendingReEngage, setPendingReEngage] = useState(false);
  const store = useAppStore();

  useEffect(() => {
    if (!fontsLoaded) return;
    initializeDatabase()
      .then(async () => {
        const { data, error: prefsError } = await getAppPrefs();
        if (prefsError) console.warn('[layout] getAppPrefs failed:', prefsError);
        if (data) {
          await i18n.changeLanguage(data.language);
          store.setLanguage(data.language);
          store.setThemePreference(data.theme_preference);
          if (data.onboarding_step) store.setOnboardingStep(data.onboarding_step);
          store.setOnboardingComplete(data.onboarding_complete);
        }
        await setupNotificationChannel();

        const now = Date.now();
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const shouldReEngage =
          data?.onboarding_complete &&
          data.last_app_open !== null &&
          now - data.last_app_open >= THREE_DAYS_MS;

        await upsertAppPrefs({ last_app_open: now }).catch((err) =>
          console.warn('[layout] upsertAppPrefs last_app_open failed:', err),
        );

        setDbReady(true);
        setPendingReEngage(Boolean(shouldReEngage));
        SplashScreen.hideAsync();
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[DB] Initialization failed:', error);
        setDbError(message);
        SplashScreen.hideAsync();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsLoaded]);

  useEffect(() => {
    if (pendingReEngage && dbReady) {
      router.replace('/re-engage');
    }
  }, [pendingReEngage, dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    let inFlight = false;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' || inFlight) return;
      getAppPrefs().then(async ({ data }) => {
        if (!data?.backup_enabled || !data.last_backup_error) return;
        const token = await getStoredAccessToken();
        if (!token) return;
        inFlight = true;
        try {
          await runBackup(token);
        } finally {
          inFlight = false;
        }
      });
    });
    return () => subscription.remove();
  }, [dbReady]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === 'follow_up_reminder' && typeof data.contactId === 'string') {
        router.push(`/contact/${data.contactId}`);
      } else if (data?.type === 'daily_nudge') {
        router.push('/(tabs)/capture');
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || (!dbReady && !dbError)) return null;

  if (dbError) {
    const palette = Colors[scheme];
    return (
      <View style={[styles.errorContainer, { backgroundColor: palette.background }]}>
        <Text style={[styles.errorTitle, { color: '#c0392b' }]}>{t('errors.storageError')}</Text>
        <Text style={[styles.errorBody, { color: palette.text }]}>{t('errors.storageErrorBody')}</Text>
        <Text style={[styles.errorDetail, { color: palette.cta }]}>{dbError}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PostHogProvider client={analyticsClient}>
        <PaperProvider theme={getPaperTheme(scheme)}>
          <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </PaperProvider>
      </PostHogProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'lowercase',
  },
  errorBody: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'lowercase',
  },
  errorDetail: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    textAlign: 'center',
  },
});
