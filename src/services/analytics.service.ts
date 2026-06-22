import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';

import { Platform } from 'react-native';

const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
const isDev = extra?.appEnv === 'development';

// Not exported — use track() to ensure PII guard is always applied
const _analyticsClient = new PostHog(extra?.posthogApiKey ?? 'placeholder', {
  host: 'https://us.i.posthog.com',
  disabled: isDev || !extra?.posthogApiKey,
  persistence: Platform.OS === 'web' ? 'memory' : undefined,
});

// Exported only for PostHogProvider in _layout.tsx — never call .capture() on it directly
export const analyticsClient = _analyticsClient;

export const ANALYTICS_EVENTS = {
  CAPTURE_COMPLETE: 'capture_complete',
  EXTRACTION_COMPLETE: 'extraction_complete',
} as const;

// Exact key names that must never appear in event properties
const PII_KEYS = new Set(['name', 'transcript', 'contact', 'phone', 'email', 'address']);

export function track(event: string, properties?: PostHogEventProperties): void {
  if (properties) {
    const piiKey = Object.keys(properties).find((k) => PII_KEYS.has(k.toLowerCase()));
    if (piiKey) {
      if (__DEV__) console.warn('[Analytics] Blocked PII key in event properties:', piiKey, event);
      return;
    }
  }
  _analyticsClient.capture(event, properties);
}
