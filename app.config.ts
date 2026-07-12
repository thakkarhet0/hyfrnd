import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "God's plan",
  slug: 'gods-plan',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'godsplan',
  userInterfaceStyle: 'dark',
  owner: 'thakkarhet',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'com.godsplan.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'com.godsplan.app',
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
    'expo-secure-store',
    [
      'expo-notifications',
      {
        icon: './assets/images/icon.png',
        color: '#208AEF',
        sounds: [],
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: 'thakkarhet',
        project: 'gods-plan-react-native',
      },
    ],
    ['react-native-iap', { paymentProvider: 'Both' }],
    [
      'expo-audio',
      {
        microphonePermission: "Allow God's plan to access your microphone to record voice memos.",
      },
    ],
    [
      'expo-contacts',
      {
        contactsPermission: "Allow God's plan to access your contacts to show people you already know.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    claudeApiKey: process.env.CLAUDE_API_KEY ?? '',
    sarvamApiKey: process.env.SARVAM_API_KEY ?? '',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? '',
    posthogApiKey: process.env.POSTHOG_API_KEY ?? '',
    sentryDsn: process.env.SENTRY_DSN ?? '',
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? '',
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID ?? '',
    appEnv: process.env.APP_ENV ?? 'development',
    eas: {
      projectId: '2bde9769-aa4b-402a-bc34-d40ecd70b8c0',
    },
  },
});
