import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FooterDOM, { type FooterTabKey } from '@/components/navigation/FooterDOM';
import DitheredBackgroundDOM from '@/components/background/DitheredBackgroundDOM';
import { useCaptureStore } from '@/stores/capture.store';

const FOOTER_HEIGHT = 58;

const ROUTE_BY_TAB = {
  capture: '/capture',
  calendar: '/calendar',
  contacts: '/contacts',
  settings: '/settings',
} as const;

export default function TabLayout() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(() => Date.now());
  const isRecording = useCaptureStore((s) => s.isRecording);
  const isPaused = useCaptureStore((s) => s.isPaused);
  const isProcessing = useCaptureStore((s) => s.isProcessing);

  const activeTab: FooterTabKey = pathname.startsWith('/calendar')
    ? 'calendar'
    : pathname.startsWith('/contacts')
      ? 'contacts'
      : pathname.startsWith('/settings')
        ? 'settings'
        : 'capture';

  // Re-roll on tab switch. (Adjusting state during render, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes,
  // instead of setState-in-effect which react-hooks/set-state-in-effect flags.)
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab);
  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    setSeed((s) => s + 1);
  }

  // Re-roll on capture recording milestones.
  const captureSignature = `${isRecording}:${isPaused}:${isProcessing}`;
  const [prevCaptureSignature, setPrevCaptureSignature] = useState(captureSignature);
  if (captureSignature !== prevCaptureSignature) {
    setPrevCaptureSignature(captureSignature);
    setSeed((s) => s + 1);
  }

  // Re-roll when the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') setSeed((s) => s + 1);
    });
    return () => subscription.remove();
  }, []);

  const handleSelect = async (tab: FooterTabKey) => {
    router.push(ROUTE_BY_TAB[tab]);
  };

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <DitheredBackgroundDOM
          seed={seed}
          dom={{
            style: styles.backgroundDom,
            scrollEnabled: false,
            backgroundColor: 'transparent',
          }}
        />
      </View>
      <View style={styles.tabs}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="capture" options={{ title: t('tabs.capture') }} />
          <Tabs.Screen name="calendar" options={{ title: t('tabs.calendar') }} />
          <Tabs.Screen name="contacts" options={{ title: t('tabs.contacts') }} />
          <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
        </Tabs>
      </View>
      <View style={{ height: FOOTER_HEIGHT + insets.bottom }}>
        <FooterDOM
          activeTab={activeTab}
          labels={{
            capture: t('tabs.capture'),
            calendar: t('tabs.calendar'),
            contacts: t('tabs.contacts'),
            settings: t('tabs.settings'),
          }}
          bottomInset={insets.bottom}
          onSelect={handleSelect}
          dom={{
            style: styles.footerDom,
            scrollEnabled: false,
            backgroundColor: 'transparent',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backgroundDom: {
    width: '100%',
    height: '100%',
  },
  tabs: {
    flex: 1,
  },
  footerDom: {
    width: '100%',
    height: '100%',
  },
});
