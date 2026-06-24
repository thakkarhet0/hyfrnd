import { useEffect, useReducer, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

import { Typography, FONT_BOLD, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { useCaptureStore } from '@/stores/capture.store';
import { useSubscriptionStore } from '@/stores/subscription.store';
import { findContactsByName, getContactCount, insertContact } from '@/db/queries/contacts';
import { findDeviceContactsByName } from '@/services/contacts-sync.service';
import { updateMemoContact } from '@/db/queries/memos';

// A candidate the recognized name matched: either an existing app contact, or a
// phone contact that will be imported (name + phone) when chosen.
type MatchItem =
  | { kind: 'app'; id: string; name: string }
  | { kind: 'device'; id: string; name: string; phone: string | null };

type Phase =
  | { kind: 'searching' }
  | { kind: 'matches'; items: MatchItem[] }
  | { kind: 'new-form'; prefill: string }
  | { kind: 'linking' };

type Action =
  | { type: 'FOUND'; items: MatchItem[] }
  | { type: 'NO_MATCH'; prefill: string }
  | { type: 'CHOOSE_NEW'; prefill: string }
  | { type: 'LINKING' };

function reducer(state: Phase, action: Action): Phase {
  switch (action.type) {
    case 'FOUND':
      return action.items.length > 0
        ? { kind: 'matches', items: action.items }
        : { kind: 'new-form', prefill: '' };
    case 'NO_MATCH':
      return { kind: 'new-form', prefill: action.prefill };
    case 'CHOOSE_NEW':
      return { kind: 'new-form', prefill: action.prefill };
    case 'LINKING':
      return { kind: 'linking' };
    default:
      return state;
  }
}

export default function ContactLinkingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { memoId, extractedName, extractedFollowUpDate, setLinkedContactId, setIsNewContact } = useCaptureStore();
  const subscriptionStore = useSubscriptionStore();

  const [phase, dispatch] = useReducer(reducer, { kind: 'searching' });
  const [newName, setNewName] = useState(extractedName ?? '');

  useEffect(() => {
    const appPromise = extractedName
      ? findContactsByName(extractedName)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null });
    const devicePromise = extractedName
      ? findDeviceContactsByName(extractedName)
      : Promise.resolve([]);

    Promise.all([getContactCount(), appPromise, devicePromise])
      .then(([countResult, appResult, deviceResult]) => {
        subscriptionStore.setContactCount(countResult.error ? 10 : countResult.data);
        if (!extractedName) {
          dispatch({ type: 'NO_MATCH', prefill: '' });
          return;
        }

        const appItems: MatchItem[] = (appResult.data ?? []).map((c) => ({
          kind: 'app',
          id: c.id,
          name: c.name,
        }));
        // Drop device matches that already exist as app contacts (by name).
        const appNames = new Set(appItems.map((c) => c.name.trim().toLowerCase()));
        const deviceItems: MatchItem[] = deviceResult
          .filter((d) => !appNames.has(d.name.trim().toLowerCase()))
          .map((d) => ({ kind: 'device', id: d.id, name: d.name, phone: d.phone }));

        dispatch({ type: 'FOUND', items: [...appItems, ...deviceItems] });
      })
      .catch(() => {
        dispatch({ type: 'NO_MATCH', prefill: extractedName ?? '' });
      });
  // subscriptionStore is a stable Zustand reference — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedName]);

  const linkContact = async (contactId: string, isNew: boolean) => {
    if (!memoId) return;
    dispatch({ type: 'LINKING' });
    const { error: linkError } = await updateMemoContact(memoId, contactId);
    if (linkError) {
      console.warn('[ContactLinking] updateMemoContact failed:', linkError.message);
    }
    setLinkedContactId(contactId);
    setIsNewContact(isNew);
    if (extractedFollowUpDate) {
      router.push('/capture-complete');
    } else {
      router.push('/follow-up-date-picker');
    }
  };

  const handleSaveNew = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // Freemium gate: free plan limited to 10 contacts
    if (subscriptionStore.plan_tier === 'free' && subscriptionStore.contact_count >= 10) {
      router.push('/paywall');
      return;
    }

    dispatch({ type: 'LINKING' });
    const { data: newId, error: insertError } = await insertContact({ name: trimmed });
    if (!newId) {
      console.warn('[ContactLinking] insertContact failed:', insertError?.message);
      dispatch({ type: 'NO_MATCH', prefill: trimmed });
      return;
    }
    subscriptionStore.setContactCount(subscriptionStore.contact_count + 1);
    await linkContact(newId, true);
  };

  const selectMatch = async (item: MatchItem) => {
    if (item.kind === 'app') {
      await linkContact(item.id, false);
      return;
    }
    // Device match: import as a tracked contact (name + phone), then link.
    if (subscriptionStore.plan_tier === 'free' && subscriptionStore.contact_count >= 10) {
      router.push('/paywall');
      return;
    }
    dispatch({ type: 'LINKING' });
    const { data: newId, error: insertError } = await insertContact({
      name: item.name,
      phone: item.phone,
    });
    if (!newId) {
      console.warn('[ContactLinking] insertContact (device) failed:', insertError?.message);
      dispatch({ type: 'CHOOSE_NEW', prefill: item.name });
      return;
    }
    subscriptionStore.setContactCount(subscriptionStore.contact_count + 1);
    await linkContact(newId, true);
  };

  if (phase.kind === 'searching' || phase.kind === 'linking') {
    return (
      <Screen style={[styles.center, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <ActivityIndicator color={theme.cta} />
        {phase.kind === 'linking' && (
          <Text style={[styles.hint, { color: theme.text }]}>{t('extraction.linking')}</Text>
        )}
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <Text style={[styles.header, { color: theme.text }]}>
        {t('extraction.isThisPerson', { name: extractedName ?? '?' })}
      </Text>

      {phase.kind === 'matches' && phase.items.length === 1 && (
        <View style={styles.row}>
          <Pressable
            style={[styles.chip, { backgroundColor: theme.highlight }]}
            onPress={() => void selectMatch(phase.items[0])}
          >
            <Text style={[styles.chipLabel, { color: INK }]}>
              {t('extraction.yes')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.chip, { borderWidth: 1, borderColor: theme.cta }]}
            onPress={() =>
              dispatch({ type: 'CHOOSE_NEW', prefill: extractedName ?? '' })
            }
          >
            <Text style={[styles.chipLabel, { color: theme.cta }]}>{t('extraction.no')}</Text>
          </Pressable>
        </View>
      )}

      {phase.kind === 'matches' && phase.items.length > 1 && (
        <View style={styles.chipsWrap}>
          {phase.items.map((m) => (
            <Pressable
              key={m.id}
              style={[styles.chip, { backgroundColor: theme.highlight }]}
              onPress={() => void selectMatch(m)}
            >
              <Text style={[styles.chipLabel, { color: INK }]}>
                {m.kind === 'device' ? t('extraction.fromPhoneMatch', { name: m.name }) : m.name}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.chip, { borderWidth: 1, borderColor: theme.cta }]}
            onPress={() => dispatch({ type: 'CHOOSE_NEW', prefill: extractedName ?? '' })}
          >
            <Text style={[styles.chipLabel, { color: theme.cta }]}>{t('extraction.no')}</Text>
          </Pressable>
        </View>
      )}

      {phase.kind === 'new-form' && (
        <View style={styles.newForm}>
          <TextInput
            style={[styles.input, { color: theme.text, borderBottomColor: theme.cta }]}
            value={newName}
            onChangeText={setNewName}
            placeholder={extractedName ?? ''}
            placeholderTextColor={theme.text + '60'}
            autoFocus
          />
          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.highlight }]}
            onPress={() => void handleSaveNew()}
          >
            <Text style={[styles.saveLabel, { color: INK }]}>
              {t('extraction.saveAsNew')}
            </Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    gap: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  header: {
    ...Typography.heading,
  },
  hint: {
    ...Typography.body,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 0,
  },
  chipLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  newForm: {
    gap: 16,
  },
  input: {
    ...Typography.body,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  saveButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 0,
  },
  saveLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
});
