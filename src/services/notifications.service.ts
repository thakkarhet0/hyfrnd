import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const FOLLOW_UP_CHANNEL_ID = 'follow-up-reminders';

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(FOLLOW_UP_CHANNEL_ID, {
    name: 'Follow-up Reminders',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

export async function scheduleFollowUpNotification(
  followUpId: string,
  contactId: string,
  contactName: string,
  dueDateMs: number,
  contextSnapshot: string | null,
): Promise<{ error: string | null }> {
  try {
    const triggerDate = new Date(Math.max(dueDateMs, Date.now()));
    triggerDate.setHours(8, 0, 0, 0);
    if (triggerDate.getTime() <= Date.now()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
    await Notifications.scheduleNotificationAsync({
      identifier: followUpId,
      content: {
        title: contactName,
        body: contextSnapshot ?? `follow up with ${contactName}`,
        data: { type: 'follow_up_reminder', contactId, followUpId },
        sound: Platform.OS === 'ios' ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return { error: null };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function cancelFollowUpNotification(followUpId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(followUpId).catch(() => null);
}

const NUDGE_IDS = ['nudge-morning', 'nudge-afternoon', 'nudge-evening'] as const;

export async function scheduleDailyNudges(
  translations: { morning: string; afternoon: string; evening: string },
  hours?: { morning: number; afternoon: number; evening: number },
): Promise<void> {
  await cancelDailyNudges();
  const h = hours ?? { morning: 8, afternoon: 13, evening: 21 };
  const nudges: { id: string; hour: number; body: string }[] = [
    { id: NUDGE_IDS[0], hour: h.morning, body: translations.morning },
    { id: NUDGE_IDS[1], hour: h.afternoon, body: translations.afternoon },
    { id: NUDGE_IDS[2], hour: h.evening, body: translations.evening },
  ];
  await Promise.all(
    nudges.map(({ id, hour, body }) =>
      Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          body,
          data: { type: 'daily_nudge' },
          sound: Platform.OS === 'ios' ? 'default' : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
        },
      }).catch((err) => console.warn(`[notifications] scheduleDailyNudge ${id} failed:`, err)),
    ),
  );
}

export async function cancelDailyNudges(): Promise<void> {
  await Promise.all(
    NUDGE_IDS.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => null)),
  );
}
