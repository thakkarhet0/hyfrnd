import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ExpoNotifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, FONT_REGULAR, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAppPrefs, upsertAppPrefs } from '@/db/queries/app-prefs';
import { scheduleDailyNudges } from '@/services/notifications.service';

const NUDGE_CONFIG = [
  { key: 'morning' as const, min: 6, max: 10, defaultHour: 8 },
  { key: 'afternoon' as const, min: 11, max: 15, defaultHour: 13 },
  { key: 'evening' as const, min: 19, max: 23, defaultHour: 21 },
];

function hourToDate(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function formatHour(hour: number): string {
  const period = hour < 12 ? 'am' : 'pm';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${period}`;
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [morningHour, setMorningHour] = useState(8);
  const [afternoonHour, setAfternoonHour] = useState(13);
  const [eveningHour, setEveningHour] = useState(21);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    getAppPrefs().then(({ data, error }) => {
      if (error) {
        console.warn('[NotificationSettings] getAppPrefs failed:', error);
        return;
      }
      if (data) {
        setMorningHour(data.nudge_morning_hour);
        setAfternoonHour(data.nudge_afternoon_hour);
        setEveningHour(data.nudge_evening_hour);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const hours = useMemo(
    () => ({ morning: morningHour, afternoon: afternoonHour, evening: eveningHour }),
    [morningHour, afternoonHour, eveningHour],
  );

  // useState setters are stable refs for the component lifetime
  const settersRef = useRef({
    morning: setMorningHour,
    afternoon: setAfternoonHour,
    evening: setEveningHour,
  } as const);

  const openAndroidPicker = useCallback(
    (key: 'morning' | 'afternoon' | 'evening') => {
      const config = NUDGE_CONFIG.find((c) => c.key === key)!;
      DateTimePickerAndroid.open({
        value: hourToDate(hours[key]),
        mode: 'time',
        is24Hour: false,
        onChange: (_event: DateTimePickerEvent, date: Date | undefined) => {
          if (date) {
            const picked = Math.max(config.min, Math.min(config.max, date.getHours()));
            settersRef.current[key](picked);
          }
        },
      });
    },
    [hours],
  );

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaved(false);
    try {
      const { error: prefsErr } = await upsertAppPrefs({
        nudge_morning_hour: morningHour,
        nudge_afternoon_hour: afternoonHour,
        nudge_evening_hour: eveningHour,
      });
      if (prefsErr) {
        console.warn('[NotificationSettings] upsertAppPrefs failed:', prefsErr);
        return;
      }

      const { status } = await ExpoNotifications.getPermissionsAsync().catch(
        () => ({ status: 'denied' as const }),
      );
      if (status === 'granted') {
        await scheduleDailyNudges(
          {
            morning: t('notifications.morning'),
            afternoon: t('notifications.afternoon'),
            evening: t('notifications.evening'),
          },
          { morning: morningHour, afternoon: afternoonHour, evening: eveningHour },
        );
      }

      setSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, morningHour, afternoonHour, eveningHour, t]);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {t('settings.notificationTiming')}
      </Text>

      <View style={styles.cardContainer}>
        {NUDGE_CONFIG.map((config, idx) => {
          const hour = hours[config.key];
          const setter = settersRef.current[config.key];
          const labelKey = `settings.${config.key}` as
            | 'settings.morning'
            | 'settings.afternoon'
            | 'settings.evening';

          return (
            <View
              key={config.key}
              style={[
                styles.row,
                idx > 0 && { borderTopWidth: 1.5, borderTopColor: '#2d2d31', paddingTop: Spacing.md },
              ]}
            >
              <Text style={[styles.rowLabel, { color: theme.text }]}>{t(labelKey)}</Text>

              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={hourToDate(hour)}
                  mode="time"
                  display="spinner"
                  onChange={(_: DateTimePickerEvent, date: Date | undefined) => {
                    if (date) {
                      const picked = Math.max(config.min, Math.min(config.max, date.getHours()));
                      setter(picked);
                    }
                  }}
                  style={styles.iosPicker}
                  textColor={theme.text}
                />
              ) : (
                <Pressable
                  onPress={() => openAndroidPicker(config.key)}
                  style={[styles.androidTimeButton, { borderBottomColor: theme.cta }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.androidTimeText, { color: theme.cta }]}>
                    {formatHour(hour)}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.btnContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.highlight,
              borderColor: theme.text,
              transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
            },
          ]}
          onPress={() => void handleSave()}
          disabled={isSaving}
          accessibilityRole="button"
        >
          <Text style={[styles.saveButtonText, { color: INK }]}>
            {saved ? t('settings.saved') : t('common.save')}
          </Text>
        </Pressable>
        <View style={[styles.btnShadow, { backgroundColor: theme.highlight + '20' }]} />
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
    padding: Spacing.md,
    gap: Spacing.md,
  },
  row: {
    gap: 8,
  },
  rowLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 15,
    textTransform: 'lowercase',
  },
  iosPicker: {
    height: 100,
  },
  androidTimeButton: {
    borderBottomWidth: 1.5,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    minWidth: 80,
  },
  androidTimeText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  btnContainer: {
    height: 52,
    position: 'relative',
    marginTop: Spacing.xs,
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
  saveButton: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  saveButtonText: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
