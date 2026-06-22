import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: palette.cta,
        tabBarInactiveTintColor: palette.text + '80',
        tabBarLabelStyle: {
          fontFamily: 'SpaceMono_400Regular',
          fontSize: 10,
          textTransform: 'lowercase',
        },
      }}
    >
      <Tabs.Screen
        name="capture"
        options={{
          title: t('tabs.capture'),
          tabBarIcon: ({ focused, color }) => (
            <SymbolView
              name={focused ? 'mic.fill' : 'mic'}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: t('tabs.contacts'),
          tabBarIcon: ({ focused, color }) => (
            <SymbolView
              name={focused ? 'person.2.fill' : 'person.2'}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ focused, color }) => (
            <SymbolView
              name={focused ? 'gearshape.fill' : 'gearshape'}
              size={24}
              tintColor={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
