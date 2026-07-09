import { router } from 'expo-router';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { FONT_BOLD, INK, Typography } from '@/constants/theme';
import { getContactCount, getContactsForList, insertContact, type ContactListItem } from '@/db/queries/contacts';
import { updateMemoContact } from '@/db/queries/memos';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchDeviceContacts,
  findDeviceContactsByName,
  getContactsPermission,
  presentDeviceContactForm,
  requestContactsPermission,
  type DeviceContact,
} from '@/services/contacts-sync.service';
import { useCaptureStore } from '@/stores/capture.store';
import { useSubscriptionStore } from '@/stores/subscription.store';

// A candidate the recognized name matched: either an existing app contact, or a
// phone contact that will be imported (name + phone) when chosen.
type MatchItem =
  | { kind: 'app'; id: string; name: string }
  | { kind: 'device'; id: string; name: string; phone: string | null };

type ScoredMatchItem = MatchItem & { score: number };

type Phase =
  | { kind: 'searching' }
  | { kind: 'matches'; items: MatchItem[] }
  | { kind: 'no-match-options' }
  | { kind: 'manual-search' }
  | { kind: 'new-form'; prefill: string }
  | { kind: 'linking' };

type Action =
  | { type: 'FOUND'; items: MatchItem[] }
  | { type: 'NO_MATCH' }
  | { type: 'CHOOSE_MANUAL' }
  | { type: 'CHOOSE_NEW'; prefill: string }
  | { type: 'LINKING' };

function getCleanRoots(name: string): string[] {
  const words = name.trim().toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const roots: string[] = [];
  const suffixes = ['bhai', 'ben', 'behn', 'ji', 'di', 'kumar', 'prasad', 'lal', 'didi', 'jiju', 'jijaji'];

  for (const word of words) {
    roots.push(word);
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length) {
        const root = word.slice(0, word.length - suffix.length);
        if (root.length >= 2) {
          roots.push(root);
        }
      }
    }
  }
  return Array.from(new Set(roots));
}

const TRANSLIT_MAP: Record<string, string> = {
  // Devanagari Consonants
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
  'च': 'c', 'छ': 'ch', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l', 'क्ष': 'ksh', 'ज्ञ': 'gy',

  // Gujarati Consonants
  'ક': 'k', 'ખ': 'kh', 'ગ': 'g', 'ઘ': 'gh', 'ઙ': 'n',
  'ચ': 'c', 'છ': 'ch', 'જ': 'j', 'ઝ': 'jh', 'ઞ': 'n',
  'ટ': 't', 'ઠ': 'th', 'ડ': 'd', 'ઢ': 'dh', 'ણ': 'n',
  'ત': 't', 'થ': 'th', 'દ': 'd', 'ધ': 'dh', 'ન': 'n',
  'પ': 'p', 'ફ': 'f', 'બ': 'b', 'ભ': 'bh', 'મ': 'm',
  'ય': 'y', 'ર': 'r', 'લ': 'l', 'વ': 'v',
  'શ': 'sh', 'ષ': 'sh', 'સ': 's', 'હ': 'h',
  'ળ': 'l', 'ક્ષ': 'ksh', 'જ્ઞ': 'gy',

  // Vowels & Diacritics
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ऋ': 'r',
  'અ': 'a', 'આ': 'a', 'ઇ': 'i', 'ઈ': 'i', 'ઉ': 'u', 'ઊ': 'u', 'એ': 'e', 'ઐ': 'ai', 'ઓ': 'o', 'ઔ': 'au', 'ઋ': 'r',
  'ા': 'a', 'િ': 'i', 'ી': 'i', 'ુ': 'u', 'ૂ': 'u', 'ે': 'e', 'ૈ': 'ai', 'ો': 'o', 'ૌ': 'au',
  'ં': 'n', 'ઃ': 'h', 'ઁ': 'n'
};

function transliterateToLatin(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const nextTwo = text.slice(i, i + 2);
    if (TRANSLIT_MAP[nextTwo]) {
      result += TRANSLIT_MAP[nextTwo];
      i++;
    } else if (TRANSLIT_MAP[text[i]]) {
      result += TRANSLIT_MAP[text[i]];
    } else {
      result += text[i];
    }
  }
  return result;
}

function toPhonetic(word: string): string {
  let w = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!w) return '';

  // 1. Simplify Indian aspirations and consonants
  w = w.replace(/dh/g, 'd');
  w = w.replace(/bh/g, 'b');
  w = w.replace(/gh/g, 'g');
  w = w.replace(/kh/g, 'k');
  w = w.replace(/th/g, 't');
  w = w.replace(/ph/g, 'f');
  w = w.replace(/sh/g, 's');
  w = w.replace(/ch/g, 'c');
  w = w.replace(/w/g, 'v'); // Map w -> v for Indian English spelling variations
  w = w.replace(/z/g, 'j'); // Map z -> j for Indian English spelling variations

  // 2. Dedup consecutive letters (e.g. "aa" -> "a", "ee" -> "e", "dd" -> "d")
  let deduped = '';
  for (let i = 0; i < w.length; i++) {
    if (w[i] !== w[i - 1]) {
      deduped += w[i];
    }
  }

  // 3. Map vowels to phonetic classes:
  // a, o, u -> a
  // e, i, y -> i
  let mapped = '';
  for (let i = 0; i < deduped.length; i++) {
    const char = deduped[i];
    if (['a', 'o', 'u'].includes(char)) {
      mapped += 'a';
    } else if (['e', 'i', 'y'].includes(char)) {
      mapped += 'i';
    } else {
      mapped += char;
    }
  }

  return mapped;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function scoreContactMatch(contactName: string, queryName: string): number {
  const cLatin = transliterateToLatin(contactName);
  const qLatin = transliterateToLatin(queryName);

  const cClean = cLatin.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const qClean = qLatin.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cClean === qClean) return 3; // Exact match

  // Prefix match (e.g. query "Hard" matching contact "Hardik Patel" starts with "Hardik")
  if (cClean.startsWith(qClean)) return 2.5;

  if (cClean.includes(qClean) || qClean.includes(cClean)) return 2; // Substring match

  const cRoots = getCleanRoots(cLatin);
  const qRoots = getCleanRoots(qLatin);

  // Check phonetic matches
  const cPhonetic = cRoots.map(toPhonetic).filter(Boolean);
  const qPhonetic = qRoots.map(toPhonetic).filter(Boolean);

  // Exact phonetic word match (e.g., "Haard" vs "Hard" -> both map to "hard")
  const hasExactPhonetic = cPhonetic.some(cp => qPhonetic.some(qp => cp === qp));
  if (hasExactPhonetic) return 2;

  // Phonetic word containment/overlap (e.g., "hardik" vs "hard" -> "hardik" contains "hard")
  const hasPhoneticOverlap = cPhonetic.some(cp => qPhonetic.some(qp => cp.includes(qp) || qp.includes(cp)));
  if (hasPhoneticOverlap) return 1.5;

  // Typo tolerance match (Levenshtein distance <= 1 or <= 2 for words of length >= 5)
  const hasTypoMatch = cRoots.some(cr =>
    qRoots.some(qr => {
      const dist = levenshteinDistance(cr, qr);
      return dist <= 1 || (dist <= 2 && Math.max(cr.length, qr.length) >= 5);
    })
  );
  if (hasTypoMatch) return 1.2;

  const hasOverlap = cRoots.some(cr => qRoots.some(qr => cr.includes(qr) || qr.includes(cr)));
  if (hasOverlap) return 1; // Word/root overlap match

  return 0; // No match
}

function HighlightedText({ text, query, theme }: { text: string; query: string; theme: any }) {
  if (!query.trim()) {
    return <Text style={{ fontSize: 16, color: theme.text }}>{text}</Text>;
  }

  // Escape regex special chars
  const escaped = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));

  return (
    <Text style={{ fontSize: 16, color: theme.text }}>
      {parts.map((part, i) => {
        const isMatch = part.toLowerCase() === query.toLowerCase();
        return (
          <Text
            key={i}
            style={isMatch ? { fontWeight: 'bold', color: theme.cta } : { fontWeight: 'normal' }}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

function reducer(state: Phase, action: Action): Phase {
  switch (action.type) {
    case 'FOUND':
      return action.items.length > 0
        ? { kind: 'matches', items: action.items }
        : { kind: 'no-match-options' };
    case 'NO_MATCH':
      return { kind: 'no-match-options' };
    case 'CHOOSE_MANUAL':
      return { kind: 'manual-search' };
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
  const {
    memoId,
    extractedName,
    extractedNameNative,
    extractedFollowUpDate,
    setLinkedContactId,
    setIsNewContact,
  } = useCaptureStore();
  const subscriptionStore = useSubscriptionStore();

  const [phase, dispatch] = useReducer(reducer, { kind: 'searching' });
  const [newName, setNewName] = useState(extractedName ?? '');

  // Manual list state variables
  const [allAppContacts, setAllAppContacts] = useState<ContactListItem[]>([]);
  const [allDeviceContacts, setAllDeviceContacts] = useState<DeviceContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingManual, setLoadingManual] = useState(false);

  useEffect(() => {
    if (!extractedName) {
      dispatch({ type: 'NO_MATCH' });
      return;
    }

    const runMatch = async () => {
      try {
        const countResult = await getContactCount();
        subscriptionStore.setContactCount(countResult.error ? 10 : countResult.data);

        const appResult = await getContactsForList();
        const appContacts = appResult.data ?? [];

        const appMatches: ScoredMatchItem[] = appContacts
          .map((c) => {
            const scoreEnglish = scoreContactMatch(c.name, extractedName);
            const scoreNative = extractedNameNative ? scoreContactMatch(c.name, extractedNameNative) : 0;
            const finalScore = Math.max(scoreEnglish, scoreNative);
            return {
              kind: 'app' as const,
              id: c.id,
              name: c.name,
              score: finalScore,
            };
          })
          .filter((c) => c.score > 0);

        // Fetch all device contacts and score locally
        const deviceContacts = await fetchDeviceContacts();

        const deviceMatches: ScoredMatchItem[] = deviceContacts
          .map((d) => {
            const scoreEnglish = scoreContactMatch(d.name, extractedName);
            const scoreNative = extractedNameNative ? scoreContactMatch(d.name, extractedNameNative) : 0;
            const finalScore = Math.max(scoreEnglish, scoreNative);
            return {
              kind: 'device' as const,
              id: d.id,
              name: d.name,
              phone: d.phone,
              score: finalScore,
            };
          })
          .filter((d) => d.score > 0);

        const combined = [...appMatches, ...deviceMatches];
        combined.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.kind !== b.kind) return a.kind === 'app' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        const seenNames = new Set<string>();
        const finalItems: MatchItem[] = [];
        for (const item of combined) {
          const nameKey = item.name.trim().toLowerCase();
          if (seenNames.has(nameKey)) continue;
          seenNames.add(nameKey);
          if (item.kind === 'app') {
            finalItems.push({ kind: 'app', id: item.id, name: item.name });
          } else {
            finalItems.push({ kind: 'device', id: item.id, name: item.name, phone: item.phone });
          }
        }

        dispatch({ type: 'FOUND', items: finalItems });
      } catch (err) {
        console.warn('[ContactLinking] Match algorithm failed:', err);
        dispatch({ type: 'NO_MATCH' });
      }
    };

    void runMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractedName, extractedNameNative]);

  // Load manual contacts when manual-search phase is activated
  useEffect(() => {
    if (phase.kind !== 'manual-search') return;

    const loadManualContacts = async () => {
      setLoadingManual(true);
      try {
        const appRes = await getContactsForList();
        const deviceRes = await fetchDeviceContacts();
        setAllAppContacts(appRes.data ?? []);
        setAllDeviceContacts(deviceRes);
      } catch (err) {
        console.warn('[ContactLinking] Failed to load manual list:', err);
      } finally {
        setLoadingManual(false);
      }
    };

    void loadManualContacts();
  }, [phase.kind]);

  const filteredSections = useMemo<{ title: string; data: MatchItem[] }[]>(() => {
    const q = searchQuery.trim();
    if (!q) {
      const appData = allAppContacts.map((c) => ({
        kind: 'app' as const,
        id: c.id,
        name: c.name,
      }));
      const appNames = new Set(appData.map((c) => c.name.trim().toLowerCase()));
      const deviceData = allDeviceContacts
        .filter((d) => !appNames.has(d.name.trim().toLowerCase()))
        .map((d) => ({
          kind: 'device' as const,
          id: d.id,
          name: d.name,
          phone: d.phone,
        }));
      const result = [];
      if (appData.length > 0) {
        result.push({ title: t('contacts.sectionYourPeople'), data: appData });
      }
      if (deviceData.length > 0) {
        result.push({ title: t('contacts.sectionFromPhone'), data: deviceData });
      }
      return result;
    }

    // Rank and filter app contacts by scoring
    const appMatches = allAppContacts
      .map((c) => ({
        kind: 'app' as const,
        id: c.id,
        name: c.name,
        score: scoreContactMatch(c.name, q),
      }))
      .filter((c) => c.score > 0);

    const appNames = new Set(appMatches.map((c) => c.name.trim().toLowerCase()));

    // Rank and filter device contacts by scoring, with phone number digit fallback
    const deviceMatches = allDeviceContacts
      .filter((d) => !appNames.has(d.name.trim().toLowerCase()))
      .map((d) => {
        let score = scoreContactMatch(d.name, q);
        const queryDigits = q.replace(/[^0-9]/g, '');
        if (d.phone && queryDigits.length > 0) {
          const phoneDigits = d.phone.replace(/[^0-9]/g, '');
          if (phoneDigits.includes(queryDigits)) {
            score = Math.max(score, 2.5); // Boost matching numbers
          }
        }
        return {
          kind: 'device' as const,
          id: d.id,
          name: d.name,
          phone: d.phone,
          score,
        };
      })
      .filter((d) => d.score > 0);

    const sortedApp = appMatches
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map(({ kind, id, name }) => ({ kind, id, name }));

    const sortedDevice = deviceMatches
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map(({ kind, id, name, phone }) => ({ kind, id, name, phone }));

    const result = [];
    if (sortedApp.length > 0) {
      result.push({ title: t('contacts.sectionYourPeople'), data: sortedApp });
    }
    if (sortedDevice.length > 0) {
      result.push({ title: t('contacts.sectionFromPhone'), data: sortedDevice });
    }
    return result;
  }, [allAppContacts, allDeviceContacts, searchQuery, t]);

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

    if (subscriptionStore.plan_tier === 'free' && subscriptionStore.contact_count >= 10) {
      router.push('/paywall');
      return;
    }

    dispatch({ type: 'LINKING' });
    const { data: newId, error: insertError } = await insertContact({ name: trimmed });
    if (!newId) {
      console.warn('[ContactLinking] insertContact failed:', insertError?.message);
      dispatch({ type: 'CHOOSE_NEW', prefill: trimmed });
      return;
    }
    subscriptionStore.setContactCount(subscriptionStore.contact_count + 1);
    await linkContact(newId, true);
  };

  const handleCreateNewContact = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      dispatch({ type: 'LINKING' });
      const perm = await getContactsPermission();
      if (!perm.granted) {
        const req = await requestContactsPermission();
        if (!req.granted) {
          throw new Error('Contacts permission denied');
        }
      }

      await presentDeviceContactForm(trimmed);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const deviceMatches = await findDeviceContactsByName(trimmed, 1);
      if (deviceMatches.length > 0) {
        await selectMatch({
          kind: 'device',
          id: deviceMatches[0].id,
          name: deviceMatches[0].name,
          phone: deviceMatches[0].phone,
        });
      } else {
        console.log('[ContactLinking] New contact not found on device list, falling back to in-app.');
        const { data: newId, error: insertError } = await insertContact({ name: trimmed });
        if (!newId) throw insertError || new Error('insert_failed');
        subscriptionStore.setContactCount(subscriptionStore.contact_count + 1);
        await linkContact(newId, true);
      }
    } catch (err) {
      console.warn('[ContactLinking] Native contact editor error, using in-app creation:', err);
      const { data: newId } = await insertContact({ name: trimmed });
      if (newId) {
        subscriptionStore.setContactCount(subscriptionStore.contact_count + 1);
        await linkContact(newId, true);
      } else {
        dispatch({ type: 'CHOOSE_NEW', prefill: trimmed });
      }
    }
  };

  const selectMatch = async (item: MatchItem) => {
    if (item.kind === 'app') {
      await linkContact(item.id, false);
      return;
    }
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
      {phase.kind === 'matches' && (
        <View style={styles.matchesBlock}>
          <Text style={[styles.header, { color: theme.text, marginBottom: 8 }]}>
            {t('extraction.isThisPerson', { name: extractedName ?? '?' })}
          </Text>
          <Text style={[styles.subHeader, { color: theme.text + '99', marginBottom: 12 }]}>
            pick the matching contact:
          </Text>
          <View style={styles.chipsWrap}>
            {phase.items.map((m) => (
              <Pressable
                key={m.id}
                style={[styles.chip, { backgroundColor: theme.highlight }]}
                onPress={() => void selectMatch(m)}
              >
                <Text style={[styles.chipLabel, { color: INK }]}>
                  {m.kind === 'device' ? `${m.name} (from phone)` : m.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: theme.text + '20', marginVertical: 16 }]} />

          <Text style={[styles.hint, { color: theme.text + '80', marginBottom: 8 }]}>
            not the right person?
          </Text>
          <Pressable
            style={[styles.actionButton, { borderColor: theme.cta, borderWidth: 1 }]}
            onPress={() => dispatch({ type: 'NO_MATCH' })}
          >
            <Text style={[styles.actionLabel, { color: theme.cta }]}>
              none of these
            </Text>
          </Pressable>
        </View>
      )}

      {phase.kind === 'no-match-options' && (
        <View style={styles.optionsBlock}>
          <Text style={[styles.header, { color: theme.text, marginBottom: 12 }]}>
            choose an option
          </Text>
          <Text style={[styles.hint, { color: theme.text, marginBottom: 20 }]}>
            {`no matching contact was selected for "${extractedName ?? ''}". how would you like to link this memo?`}
          </Text>

          <View style={styles.optionsCol}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.highlight }]}
              onPress={() => dispatch({ type: 'CHOOSE_MANUAL' })}
            >
              <Text style={[styles.actionLabel, { color: INK }]}>
                find contact manually
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { borderColor: theme.cta, borderWidth: 1, marginTop: 12 }]}
              onPress={() => dispatch({ type: 'CHOOSE_NEW', prefill: extractedName ?? '' })}
            >
              <Text style={[styles.actionLabel, { color: theme.cta }]}>
                create new contact
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase.kind === 'manual-search' && (
        <View style={{ flex: 1, gap: 16 }}>
          <Text style={[styles.header, { color: theme.text }]}>
            find contact
          </Text>

          <View style={[styles.searchBox, { borderColor: theme.text + '20', backgroundColor: theme.text + '06' }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="search your contacts..."
              placeholderTextColor={theme.text + '60'}
              clearButtonMode="while-editing"
            />
          </View>

          {loadingManual ? (
            <ActivityIndicator color={theme.cta} style={{ marginTop: 20 }} />
          ) : filteredSections.length === 0 ? (
            <Text style={[styles.hint, { color: theme.text + '80', textAlign: 'center', marginTop: 20 }]}>
              no contacts found.
            </Text>
          ) : (
            <SectionList<MatchItem, { title: string; data: MatchItem[] }>
              sections={filteredSections}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.text + '10' }]}
                  onPress={() => void selectMatch(item)}
                >
                  <HighlightedText text={item.name} query={searchQuery} theme={theme} />
                  {item.kind === 'device' && (
                    <Text style={{ fontSize: 12, color: theme.text + '60', textTransform: 'lowercase' }}>from phone</Text>
                  )}
                </Pressable>
              )}
              renderSectionHeader={({ section }) => (
                <View style={{ backgroundColor: theme.text + '10', padding: 8, paddingHorizontal: 12, marginTop: 12 }}>
                  <Text style={{ fontWeight: 'bold', color: theme.text, fontSize: 12, textTransform: 'lowercase' }}>{section.title}</Text>
                </View>
              )}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            />
          )}

          <Pressable
            style={[styles.actionButton, { borderColor: theme.cta, borderWidth: 1 }]}
            onPress={() => dispatch({ type: 'NO_MATCH' })}
          >
            <Text style={[styles.actionLabel, { color: theme.cta }]}>
              go back
            </Text>
          </Pressable>
        </View>
      )}

      {phase.kind === 'new-form' && (
        <View style={styles.newForm}>
          <Text style={[styles.header, { color: theme.text, marginBottom: 8 }]}>
            create contact
          </Text>
          <Text style={[styles.hint, { color: theme.text }]}>
            confirm or edit the name:
          </Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderBottomColor: theme.cta }]}
            value={newName}
            onChangeText={setNewName}
            placeholder={extractedName ?? ''}
            placeholderTextColor={theme.text + '60'}
            autoFocus
          />

          <View style={{ gap: 12, marginTop: 16 }}>
            <Pressable
              style={[styles.actionButton, { backgroundColor: theme.highlight }]}
              onPress={() => void handleCreateNewContact()}
            >
              <Text style={[styles.actionLabel, { color: INK }]}>
                create on phone contacts
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { borderColor: theme.cta, borderWidth: 1 }]}
              onPress={() => void handleSaveNew()}
            >
              <Text style={[styles.actionLabel, { color: theme.cta }]}>
                create in app only
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { borderColor: theme.text + '30', borderWidth: 1 }]}
              onPress={() => dispatch({ type: 'NO_MATCH' })}
            >
              <Text style={[styles.actionLabel, { color: theme.text }]}>
                cancel
              </Text>
            </Pressable>
          </View>
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
  subHeader: {
    ...Typography.body,
    fontFamily: FONT_BOLD,
  },
  hint: {
    ...Typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowName: {
    ...Typography.body,
    fontFamily: FONT_BOLD,
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
  matchesBlock: {
    gap: 16,
  },
  optionsBlock: {
    gap: 16,
  },
  optionsCol: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 0,
  },
  actionLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  divider: {
    height: 1,
  },
  searchBox: {
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchInput: {
    fontSize: 16,
    paddingVertical: 8,
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
});
