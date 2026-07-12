import { StyleSheet, View } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FooterDOM, { type FooterTabKey } from '@/components/navigation/FooterDOM';

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

  const activeTab: FooterTabKey = pathname.startsWith('/calendar')
    ? 'calendar'
    : pathname.startsWith('/contacts')
      ? 'contacts'
      : pathname.startsWith('/settings')
        ? 'settings'
        : 'capture';

  const handleSelect = async (tab: FooterTabKey) => {
    router.push(ROUTE_BY_TAB[tab]);
  };

  return (
    <View style={styles.root}>
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
  tabs: {
    flex: 1,
  },
  footerDom: {
    width: '100%',
    height: '100%',
  },
});
