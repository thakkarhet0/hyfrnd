import { useCallback, useReducer, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { getContactDetail, deleteContact, type ContactDetail } from '@/db/queries/contacts';
import { getMemosForContact, type MemoWithId } from '@/db/queries/memos';
import { getContextPointsForMemo, updateContextPoint, deleteContextPoint, insertContextPoint, type ContextPoint } from '@/db/queries/context-points';
import { getFollowUpsForContact, updateFollowUpStatus, type FollowUp } from '@/db/queries/follow-ups';
import { scheduleFollowUpNotification, cancelFollowUpNotification } from '@/services/notifications.service';

type AnyTheme = { background: string; text: string; cta: string; accent: string };

// ─── Types ──────────────────────────────────────────────────────────────────

interface MemoRow {
  memo: MemoWithId;
  contextPoints: ContextPoint[];
}

interface State {
  contact: ContactDetail | null;
  memoRows: MemoRow[];
  followUps: FollowUp[];
  loading: boolean;
  editingPointId: string | null;
  editingText: string;
  addingMemoId: string | null;
  addingText: string;
}

type Action =
  | { type: 'LOADED'; contact: ContactDetail; memoRows: MemoRow[]; followUps: FollowUp[] }
  | { type: 'START_EDIT'; id: string; text: string }
  | { type: 'CHANGE_EDIT'; text: string }
  | { type: 'CANCEL_EDIT' }
  | { type: 'SAVE_EDIT'; id: string; text: string }
  | { type: 'DELETE_POINT'; id: string; memoId: string }
  | { type: 'START_ADD'; memoId: string }
  | { type: 'CHANGE_ADD'; text: string }
  | { type: 'CANCEL_ADD' }
  | { type: 'SAVE_ADD'; memoId: string; point: ContextPoint }
  | { type: 'UPDATE_FOLLOW_UP'; id: string; status: FollowUp['status']; dueDate?: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOADED':
      return { ...state, loading: false, contact: action.contact, memoRows: action.memoRows, followUps: action.followUps };
    case 'START_EDIT':
      return { ...state, editingPointId: action.id, editingText: action.text, addingMemoId: null };
    case 'CHANGE_EDIT':
      return { ...state, editingText: action.text };
    case 'CANCEL_EDIT':
      return { ...state, editingPointId: null, editingText: '' };
    case 'SAVE_EDIT':
      return {
        ...state,
        editingPointId: null,
        editingText: '',
        memoRows: state.memoRows.map((row) => ({
          ...row,
          contextPoints: row.contextPoints.map((cp) =>
            cp.id === action.id ? { ...cp, content: action.text } : cp,
          ),
        })),
      };
    case 'DELETE_POINT':
      return {
        ...state,
        memoRows: state.memoRows.map((row) =>
          row.memo.id === action.memoId
            ? { ...row, contextPoints: row.contextPoints.filter((cp) => cp.id !== action.id) }
            : row,
        ),
      };
    case 'START_ADD':
      return { ...state, addingMemoId: action.memoId, addingText: '', editingPointId: null };
    case 'CHANGE_ADD':
      return { ...state, addingText: action.text };
    case 'CANCEL_ADD':
      return { ...state, addingMemoId: null, addingText: '' };
    case 'UPDATE_FOLLOW_UP':
      return {
        ...state,
        followUps: state.followUps.map((fu) =>
          fu.id === action.id
            ? { ...fu, status: action.status, ...(action.dueDate !== undefined ? { due_date: action.dueDate } : {}) }
            : fu,
        ),
      };
    case 'SAVE_ADD':
      return {
        ...state,
        addingMemoId: null,
        addingText: '',
        memoRows: state.memoRows.map((row) =>
          row.memo.id === action.memoId
            ? { ...row, contextPoints: [...row.contextPoints, action.point] }
            : row,
        ),
      };
    default:
      return state;
  }
}

const initialState: State = {
  contact: null,
  memoRows: [],
  followUps: [],
  loading: true,
  editingPointId: null,
  editingText: '',
  addingMemoId: null,
  addingText: '',
};

// ─── Subcomponents ──────────────────────────────────────────────────────────

function ContextPointItem({
  point,
  isEditing,
  editText,
  theme,
  t,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  point: ContextPoint;
  isEditing: boolean;
  editText: string;
  theme: AnyTheme;
  t: (key: string) => string;
  onStartEdit: () => void;
  onChangeEdit: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<TextInput>(null);

  if (isEditing) {
    return (
      <View style={styles.cpEditRow}>
        <TextInput
          ref={inputRef}
          style={[styles.cpEditInput, { color: theme.text, borderBottomColor: theme.cta }]}
          value={editText}
          onChangeText={onChangeEdit}
          onSubmitEditing={onSaveEdit}
          autoFocus
          returnKeyType="done"
          multiline={false}
        />
        <Pressable onPress={onCancelEdit} hitSlop={8}>
          <Text style={[styles.cpAction, { color: theme.text + '60' }]}>✕</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.cpRow}>
      <Text style={[styles.cpBullet, { color: theme.text + '60' }]}>·</Text>
      <Pressable style={styles.cpContent} onPress={onStartEdit} onLongPress={onDelete}>
        <Text style={[styles.cpText, { color: theme.text }]}>{point.content}</Text>
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert(t('contacts.deleteContextPoint'), point.content, [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: onDelete },
          ])
        }
        hitSlop={8}
      >
        <Text style={[styles.cpAction, { color: theme.text + '40' }]}>✕</Text>
      </Pressable>
    </View>
  );
}

function MemoSection({
  row,
  state,
  theme,
  t,
  dispatch,
  onSaveEdit,
  onDeletePoint,
  onSaveAdd,
}: {
  row: MemoRow;
  state: State;
  theme: AnyTheme;
  t: (key: string) => string;
  dispatch: React.Dispatch<Action>;
  onSaveEdit: (id: string) => void;
  onDeletePoint: (id: string, memoId: string) => void;
  onSaveAdd: (memoId: string) => void;
}) {
  const dateStr = new Date(row.memo.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isAddingToThis = state.addingMemoId === row.memo.id;

  return (
    <View style={[styles.memoSection, { borderLeftColor: theme.cta + '40' }]}>
      <Text style={[styles.memoDate, { color: theme.text + '60' }]}>{dateStr}</Text>

      {row.contextPoints.map((cp) => (
        <ContextPointItem
          key={cp.id}
          point={cp}
          isEditing={state.editingPointId === cp.id}
          editText={state.editingText}
          theme={theme}
          t={t}
          onStartEdit={() => dispatch({ type: 'START_EDIT', id: cp.id, text: cp.content })}
          onChangeEdit={(text) => dispatch({ type: 'CHANGE_EDIT', text })}
          onSaveEdit={() => onSaveEdit(cp.id)}
          onCancelEdit={() => dispatch({ type: 'CANCEL_EDIT' })}
          onDelete={() => onDeletePoint(cp.id, row.memo.id)}
        />
      ))}

      {row.contextPoints.length === 0 && (
        <Text style={[styles.noItems, { color: theme.text + '40' }]}>{t('contacts.noMemos')}</Text>
      )}

      {isAddingToThis ? (
        <View style={styles.cpEditRow}>
          <TextInput
            style={[styles.cpEditInput, { color: theme.text, borderBottomColor: theme.cta }]}
            value={state.addingText}
            onChangeText={(text) => dispatch({ type: 'CHANGE_ADD', text })}
            onSubmitEditing={() => onSaveAdd(row.memo.id)}
            onBlur={() => onSaveAdd(row.memo.id)}
            placeholder={t('contacts.addNote')}
            placeholderTextColor={theme.text + '40'}
            autoFocus
            returnKeyType="done"
          />
          <Pressable onPress={() => dispatch({ type: 'CANCEL_ADD' })} hitSlop={8}>
            <Text style={[styles.cpAction, { color: theme.text + '60' }]}>✕</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => dispatch({ type: 'START_ADD', memoId: row.memo.id })}
          style={styles.addNoteBtn}
        >
          <Text style={[styles.addNoteBtnText, { color: theme.cta }]}>+ {t('contacts.addNote')}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reschedulingFollowUp, setReschedulingFollowUp] = useState<FollowUp | null>(null);
  const [reschedulePickerDate, setReschedulePickerDate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: contact }, { data: memoList }, { data: followUpList }] = await Promise.all([
      getContactDetail(id),
      getMemosForContact(id),
      getFollowUpsForContact(id),
    ]);
    if (!contact) return;
    const memoRows: MemoRow[] = await Promise.all(
      (memoList ?? []).map(async (memo) => {
        const { data: points } = await getContextPointsForMemo(memo.id);
        return { memo, contextPoints: points ?? [] };
      }),
    );
    dispatch({ type: 'LOADED', contact, memoRows, followUps: followUpList ?? [] });
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleSaveEdit = useCallback(
    async (pointId: string) => {
      const trimmed = state.editingText.trim();
      if (!trimmed) {
        dispatch({ type: 'CANCEL_EDIT' });
        return;
      }
      dispatch({ type: 'SAVE_EDIT', id: pointId, text: trimmed });
      const { error } = await updateContextPoint(pointId, trimmed);
      if (error) console.warn('[contact-detail] updateContextPoint error:', error);
    },
    [state.editingText],
  );

  const handleDeletePoint = useCallback(async (pointId: string, memoId: string) => {
    dispatch({ type: 'DELETE_POINT', id: pointId, memoId });
    const { error } = await deleteContextPoint(pointId);
    if (error) console.warn('[contact-detail] deleteContextPoint error:', error);
  }, []);

  const handleSaveAdd = useCallback(
    async (memoId: string) => {
      const trimmed = state.addingText.trim();
      if (!trimmed) {
        dispatch({ type: 'CANCEL_ADD' });
        return;
      }
      const { data: newId, error } = await insertContextPoint({ memoId, content: trimmed });
      if (error || !newId) {
        console.warn('[contact-detail] insertContextPoint error:', error);
        dispatch({ type: 'CANCEL_ADD' });
        return;
      }
      const newPoint: ContextPoint = { id: newId, memo_id: memoId, content: trimmed, created_at: Date.now() };
      dispatch({ type: 'SAVE_ADD', memoId, point: newPoint });
    },
    [state.addingText],
  );

  const handleCompleteFollowUp = useCallback(async (fu: FollowUp) => {
    dispatch({ type: 'UPDATE_FOLLOW_UP', id: fu.id, status: 'completed' });
    const { error } = await updateFollowUpStatus(fu.id, 'completed');
    if (error) console.warn('[contact-detail] updateFollowUpStatus failed:', error);
    await cancelFollowUpNotification(fu.id);
  }, []);

  const handleSnoozeFollowUp = useCallback(async (fu: FollowUp) => {
    const baseDate = Math.max(fu.due_date, Date.now());
    const newDueDate = baseDate + 7 * 24 * 60 * 60 * 1000;
    dispatch({ type: 'UPDATE_FOLLOW_UP', id: fu.id, status: 'pending', dueDate: newDueDate });
    const { error } = await updateFollowUpStatus(fu.id, 'pending', newDueDate);
    if (error) console.warn('[contact-detail] updateFollowUpStatus snooze failed:', error);
    await cancelFollowUpNotification(fu.id);
    const contactName = state.contact?.name;
    if (contactName) {
      const { error: notifError } = await scheduleFollowUpNotification(
        fu.id, fu.contact_id, contactName, newDueDate, fu.context_snapshot,
      );
      if (notifError) console.warn('[contact-detail] scheduleFollowUpNotification failed:', notifError);
    }
  }, [state.contact]);

  const handleRescheduleFollowUp = useCallback((fu: FollowUp) => {
    if (Platform.OS === 'android') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const contactName = state.contact?.name ?? '';
      DateTimePickerAndroid.open({
        value: tomorrow,
        mode: 'date',
        minimumDate: tomorrow,
        onChange: async (event: DateTimePickerEvent, date: Date | undefined) => {
          if (event.type === 'set' && date) {
            const newDueDate = date.getTime();
            dispatch({ type: 'UPDATE_FOLLOW_UP', id: fu.id, status: 'pending', dueDate: newDueDate });
            const { error } = await updateFollowUpStatus(fu.id, 'pending', newDueDate);
            if (error) console.warn('[contact-detail] reschedule updateFollowUpStatus failed:', error);
            await cancelFollowUpNotification(fu.id);
            if (contactName) {
              const { error: notifError } = await scheduleFollowUpNotification(
                fu.id, fu.contact_id, contactName, newDueDate, fu.context_snapshot,
              );
              if (notifError) console.warn('[contact-detail] reschedule scheduleFollowUpNotification failed:', notifError);
            }
          }
        },
      });
    } else {
      setReschedulePickerDate(new Date(fu.due_date));
      setReschedulingFollowUp(fu);
    }
  }, [state.contact]);

  const handleRescheduleConfirm = useCallback(async (fu: FollowUp, date: Date) => {
    const newDueDate = date.getTime();
    const contactName = state.contact?.name;
    setReschedulingFollowUp(null);
    dispatch({ type: 'UPDATE_FOLLOW_UP', id: fu.id, status: 'pending', dueDate: newDueDate });
    const { error } = await updateFollowUpStatus(fu.id, 'pending', newDueDate);
    if (error) console.warn('[contact-detail] reschedule updateFollowUpStatus failed:', error);
    await cancelFollowUpNotification(fu.id);
    if (contactName) {
      const { error: notifError } = await scheduleFollowUpNotification(
        fu.id, fu.contact_id, contactName, newDueDate, fu.context_snapshot,
      );
      if (notifError) console.warn('[contact-detail] reschedule scheduleFollowUpNotification failed:', notifError);
    }
  }, [state.contact]);

  const handleDelete = useCallback(() => {
    if (!state.contact) return;
    Alert.alert(
      t('contacts.deleteConfirmTitle', { name: state.contact.name }),
      t('contacts.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            const { error } = await deleteContact(id!);
            if (error) {
              console.warn('[contact-detail] deleteContact error:', error);
              setDeleteLoading(false);
              return;
            }
            router.replace('/(tabs)/contacts');
          },
        },
      ],
    );
  }, [state.contact, id, t]);

  if (state.loading) {
    return (
      <Screen style={[styles.container, styles.centered, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <Text style={[styles.bodyText, { color: theme.text + '60' }]}>loading…</Text>
      </Screen>
    );
  }

  if (!state.contact) {
    return (
      <Screen style={[styles.container, styles.centered, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <Text style={[styles.bodyText, { color: theme.text }]}>contact not found</Text>
      </Screen>
    );
  }

  const { contact, memoRows, followUps } = state;

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        {contact.photo_uri ? (
          <Image source={{ uri: contact.photo_uri }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatarPlaceholder, { borderColor: theme.cta, backgroundColor: theme.cardBg }]}>
            <Text style={[styles.avatarInitial, { color: theme.cta }]}>
              {contact.name.charAt(0).toLowerCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.nameText, { color: theme.text }]}>{contact.name}</Text>
          {contact.phone ? (
            <Text style={[styles.phoneText, { color: theme.text + '80' }]}>{contact.phone}</Text>
          ) : null}
        </View>
        <View style={styles.editBtnContainer}>
          <Pressable
            onPress={() => router.push(`/contact/${id}/edit`)}
            style={({ pressed }) => [
              styles.editBtn,
              {
                backgroundColor: theme.background,
                borderColor: theme.cta,
                transform: [{ translateY: pressed ? 1.5 : 0 }, { translateX: pressed ? 1.5 : 0 }],
              },
            ]}
          >
            <Text style={[styles.editBtnText, { color: theme.cta }]}>{t('contacts.edit')}</Text>
          </Pressable>
          <View style={[styles.editBtnShadow, { backgroundColor: theme.cta + '20', borderColor: theme.cardBorder }]} />
        </View>
      </View>

      {/* Follow-ups */}
      {followUps.length > 0 ? (
        <View style={styles.section}>
          {followUps.map((fu) => (
             <View key={fu.id} style={[styles.followUpRow, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
              <View style={[styles.accentBar, { backgroundColor: fu.status === 'pending' ? theme.highlight : theme.text + '40' }]} />
              <View style={styles.followUpContent}>
                <View style={[styles.followUpDateChip, { backgroundColor: theme.highlight + '20', borderColor: theme.highlight, borderWidth: 1 }]}>
                  <Text style={[styles.followUpDateChipText, { color: theme.cta }]}>
                    {new Date(fu.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.followUpStatus, { color: theme.text + '60' }]}>
                  {t(`contacts.${fu.status}` as const)}
                </Text>
                {fu.context_snapshot ? (
                  <Text style={[styles.cpText, { color: theme.text + '80' }]} numberOfLines={2}>
                    {fu.context_snapshot}
                  </Text>
                ) : null}
                {fu.status === 'pending' && (
                  <View style={styles.followUpActions}>
                    <Pressable
                      onPress={() => void handleCompleteFollowUp(fu)}
                      style={[styles.fuActionBtn, { backgroundColor: theme.highlight }]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.fuActionText, { color: INK }]}>{t('contacts.completeAction')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleSnoozeFollowUp(fu)}
                      style={[styles.fuActionBtn, { borderWidth: 1, borderColor: theme.cta }]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.fuActionText, { color: theme.cta }]}>{t('contacts.snoozeAction')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRescheduleFollowUp(fu)}
                      style={[styles.fuActionBtn, { borderWidth: 1, borderColor: theme.text + '40' }]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.fuActionText, { color: theme.text + '80' }]}>{t('contacts.rescheduleAction')}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* iOS reschedule date picker */}
      {reschedulingFollowUp && Platform.OS === 'ios' && (
        <View style={[styles.iosPickerOverlay, { backgroundColor: theme.background, borderColor: theme.cta + '40' }]}>
          <DateTimePicker
            value={reschedulePickerDate}
            mode="date"
            minimumDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })()}
            display="spinner"
            onChange={(_: DateTimePickerEvent, date: Date | undefined) => {
              if (date) setReschedulePickerDate(date);
            }}
            textColor={theme.text}
          />
          <View style={styles.iosPickerButtons}>
            <Pressable
              onPress={() => void handleRescheduleConfirm(reschedulingFollowUp, reschedulePickerDate)}
              style={[styles.fuActionBtn, { backgroundColor: theme.highlight }]}
              accessibilityRole="button"
            >
              <Text style={[styles.fuActionText, { color: INK }]}>{t('common.confirm')}</Text>
            </Pressable>
            <Pressable onPress={() => setReschedulingFollowUp(null)} style={styles.iosPickerCancel} accessibilityRole="button">
              <Text style={[styles.fuActionText, { color: theme.text + '60' }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Memos + Context Points */}
      {memoRows.length > 0 ? (
        <View style={styles.section}>
          {memoRows.map((row) => (
            <MemoSection
              key={row.memo.id}
              row={row}
              state={state}
              theme={theme}
              t={t}
              dispatch={dispatch}
              onSaveEdit={handleSaveEdit}
              onDeletePoint={handleDeletePoint}
              onSaveAdd={handleSaveAdd}
            />
          ))}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.noItems, { color: theme.text + '40' }]}>{t('contacts.noMemos')}</Text>
        </View>
      )}

      {/* Delete */}
      <View style={styles.deleteBtnContainer}>
        <Pressable
          onPress={handleDelete}
          disabled={deleteLoading}
          style={({ pressed }) => [
            styles.deleteBtn,
            {
              backgroundColor: theme.background,
              borderColor: '#c0392b',
              transform: [{ translateY: pressed ? 2 : 0 }, { translateX: pressed ? 2 : 0 }],
            },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.deleteBtnText, { color: '#c0392b', opacity: deleteLoading ? 0.5 : 1 }]}>
            {deleteLoading ? 'deleting…' : t('contacts.delete')}
          </Text>
        </Pressable>
        <View style={[styles.deleteBtnShadow, { borderColor: '#c0392b', backgroundColor: 'rgba(192, 57, 43, 0.1)' }]} />
      </View>
    </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  avatar: { width: 56, height: 56 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#15161a',
  },
  avatarInitial: { ...Typography.heading, fontSize: 24 },
  headerText: { flex: 1, gap: 2 },
  nameText: { ...Typography.heading },
  phoneText: { fontFamily: FONT_REGULAR, fontSize: 14, textTransform: 'lowercase' },
  editBtnContainer: {
    position: 'relative',
    height: 34,
    width: 72,
  },
  editBtnShadow: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: -2,
    bottom: -2,
    borderWidth: 1.5,
    borderColor: '#3a3a3e',
    zIndex: 0,
  },
  editBtn: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  editBtnText: { fontFamily: FONT_BOLD, fontSize: 14, textTransform: 'lowercase' },
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  followUpRow: {
    flexDirection: 'row',
    borderWidth: 1.5,
    backgroundColor: '#222225',
    marginBottom: Spacing.sm,
  },
  accentBar: { width: 5, alignSelf: 'stretch' },
  followUpContent: {
    flex: 1,
    padding: Spacing.sm + 4,
    gap: 6,
  },
  followUpDateChip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  followUpDateChipText: { fontFamily: FONT_BOLD, fontSize: 13, textTransform: 'lowercase' },
  followUpStatus: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  followUpActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  fuActionBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  fuActionText: { fontFamily: FONT_REGULAR, fontSize: 14, textTransform: 'lowercase' },
  iosPickerOverlay: { marginHorizontal: Spacing.lg, borderWidth: 1, padding: Spacing.sm, marginBottom: Spacing.md },
  iosPickerButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  iosPickerCancel: { alignItems: 'center', paddingVertical: Spacing.sm, flex: 1 },
  memoSection: {
    borderLeftWidth: 2,
    paddingLeft: Spacing.md,
    marginBottom: Spacing.lg,
  },
  memoDate: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase', marginBottom: 4 },
  cpRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 4 },
  cpBullet: { fontFamily: FONT_BOLD, fontSize: 16, lineHeight: 22 },
  cpContent: { flex: 1 },
  cpText: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  cpAction: { fontFamily: FONT_REGULAR, fontSize: 16, paddingTop: 2 },
  cpEditRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  cpEditInput: {
    flex: 1,
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    borderBottomWidth: 1,
    paddingVertical: 2,
    textTransform: 'lowercase',
  },
  addNoteBtn: { paddingVertical: 4 },
  addNoteBtnText: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
  noItems: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase', marginBottom: 4 },
  bodyText: { ...Typography.body },
  deleteBtnContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    height: 52,
    position: 'relative',
  },
  deleteBtnShadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderWidth: 1.5,
    zIndex: 0,
  },
  deleteBtn: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    zIndex: 1,
  },
  deleteBtnText: { fontFamily: FONT_BOLD, fontSize: 16, textTransform: 'lowercase' },
});
