import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Calendar from 'expo-calendar';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { FONT_BOLD, FONT_REGULAR, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useCaptureStore } from '@/stores/capture.store';

function getTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

async function getDefaultCalendarId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      return defaultCal?.id ?? null;
    }
    const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    return cals.find((c) => c.allowsModifications)?.id ?? null;
  } catch {
    return null;
  }
}

async function createCalendarEvent(date: Date, name: string, notes: string | null): Promise<void> {
  try {
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) return;
    const endDate = new Date(date.getTime() + 3600000);
    await Calendar.createEventAsync(calendarId, {
      title: name,
      startDate: date,
      endDate,
      notes: notes ?? undefined,
      alarms: [{ relativeOffset: -60 }],
    });
  } catch (err) {
    console.warn('[follow-up-date-picker] createCalendarEvent failed:', err);
  }
}

export default function FollowUpDatePickerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { extractedName, extractedContextPoints, setExtractedFollowUpDate } = useCaptureStore();

  const [selectedDate, setSelectedDate] = useState<Date>(getTomorrow);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contextSnapshot = extractedContextPoints ? extractedContextPoints.join('; ') : null;
  const contactName = extractedName ?? '';

  const handleConfirm = useCallback(
    async (date: Date) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        setExtractedFollowUpDate(date.toISOString());

        const { status } = await Calendar.requestCalendarPermissionsAsync().catch(() => ({
          status: 'denied' as const,
        }));

        if (status === 'granted') {
          await createCalendarEvent(date, contactName, contextSnapshot);
        }

        router.replace('/capture-complete');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, contactName, contextSnapshot, setExtractedFollowUpDate],
  );

  const handleSkip = useCallback(() => {
    router.replace('/capture-complete');
  }, []);

  // Android: show native date picker imperatively on mount
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const tomorrow = getTomorrow();
    DateTimePickerAndroid.open({
      value: tomorrow,
      mode: 'date',
      minimumDate: tomorrow,
      onChange: (event: DateTimePickerEvent, date: Date | undefined) => {
        if (event.type === 'set' && date) {
          void handleConfirm(date);
        } else {
          handleSkip();
        }
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Android: render a minimal loading shell while native picker is open
  if (Platform.OS === 'android') {
    return (
      <Screen style={[styles.center, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <ActivityIndicator color={theme.cta} />
      </Screen>
    );
  }

  // iOS: inline spinner picker
  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Text style={[styles.title, { color: theme.text }]}>
        {t('followUp.scheduleTitle')}
      </Text>

      <DateTimePicker
        value={selectedDate}
        mode="date"
        minimumDate={getTomorrow()}
        display="spinner"
        onChange={(_: DateTimePickerEvent, date: Date | undefined) => {
          if (date) setSelectedDate(date);
        }}
        style={styles.picker}
        textColor={theme.text}
      />

      <Pressable
        style={({ pressed }) => [
          styles.confirmBtn,
          { backgroundColor: theme.highlight, opacity: isSubmitting || pressed ? 0.8 : 1 },
        ]}
        onPress={() => void handleConfirm(selectedDate)}
        disabled={isSubmitting}
        accessibilityRole="button"
      >
        {isSubmitting ? (
          <ActivityIndicator color={INK} />
        ) : (
          <Text style={[styles.confirmText, { color: INK }]}>
            {t('followUp.confirm')}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={handleSkip}
        disabled={isSubmitting}
        accessibilityRole="button"
        style={styles.skipBtn}
      >
        <Text style={[styles.skipText, { color: theme.text }]}>
          {t('followUp.skip')}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    gap: Spacing.lg,
  },
  title: {
    fontFamily: FONT_BOLD,
    fontSize: 24,
    textTransform: 'lowercase',
  },
  picker: {
    alignSelf: 'center',
    width: '100%',
  },
  confirmBtn: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  confirmText: {
    fontFamily: FONT_REGULAR,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  skipBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  skipText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
