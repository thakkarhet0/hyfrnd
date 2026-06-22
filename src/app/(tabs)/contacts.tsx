import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import { type ContactListItem, getContactsForList } from '@/db/queries/contacts';
import {
  type ContactsPermission,
  type DeviceContact,
  addDeviceContactsListener,
  fetchDeviceContacts,
  getContactsPermission,
  requestContactsPermission,
} from '@/services/contacts-sync.service';

type AnyTheme = { background: string; text: string; cta: string; accent: string };

function formatDate(ts: number | null): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Last 10 digits — enough to match the same number with/without country code. */
function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}

function AppContactRow({
  item,
  theme,
  t,
}: {
  item: ContactListItem;
  theme: AnyTheme;
  t: (key: string) => string;
}) {
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: theme.text + '20' }]}
      onPress={() => router.push(`/contact/${item.id}`)}
      accessibilityLabel={item.name}
    >
      <Text style={[styles.rowName, { color: theme.text }]}>{item.name}</Text>
      <View style={styles.rowMeta}>
        {item.last_interaction ? (
          <Text style={[styles.metaText, { color: theme.text + '80' }]}>
            {t('contacts.lastSeen')} {formatDate(item.last_interaction)}
          </Text>
        ) : null}
        {item.next_follow_up ? (
          <Text style={[styles.metaText, { color: theme.cta }]}>
            {t('contacts.followUpOn')} {formatDate(item.next_follow_up)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function DeviceContactRow({ item, theme }: { item: DeviceContact; theme: AnyTheme }) {
  return (
    <View style={[styles.row, { borderBottomColor: theme.text + '20' }]}>
      <Text style={[styles.rowName, { color: theme.text }]}>{item.name}</Text>
      {item.phone ? (
        <Text style={[styles.metaText, { color: theme.text + '80' }]}>{item.phone}</Text>
      ) : null}
    </View>
  );
}

type Section =
  | { key: 'app'; title: string; data: ContactListItem[] }
  | { key: 'phone'; title: string; data: DeviceContact[] };

export default function ContactsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [appContacts, setAppContacts] = useState<ContactListItem[]>([]);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [permission, setPermission] = useState<ContactsPermission | null>(null);
  const [query, setQuery] = useState('');
  const askedThisSession = useRef(false);

  const loadAppContacts = useCallback(async () => {
    const { data } = await getContactsForList();
    setAppContacts(data ?? []);
  }, []);

  const loadDeviceContacts = useCallback(async () => {
    const list = await fetchDeviceContacts();
    setDeviceContacts(list);
  }, []);

  // Resolve contacts permission, asking once per session if the OS still allows
  // a prompt (onboarding may have already handled it).
  const syncPermission = useCallback(async () => {
    let perm = await getContactsPermission();
    if (!perm.granted && !perm.blocked && !askedThisSession.current) {
      askedThisSession.current = true;
      perm = await requestContactsPermission();
    }
    setPermission(perm);
    if (perm.granted) await loadDeviceContacts();
    else setDeviceContacts([]);
  }, [loadDeviceContacts]);

  useFocusEffect(
    useCallback(() => {
      void loadAppContacts();
      void syncPermission();
    }, [loadAppContacts, syncPermission]),
  );

  // Keep the "from phone" list fresh when the user edits device contacts.
  useEffect(() => {
    if (!permission?.granted) return;
    const sub = addDeviceContactsListener(() => void loadDeviceContacts());
    return () => sub.remove();
  }, [permission?.granted, loadDeviceContacts]);

  // Device contacts already tracked in-app (matched by name or phone) are hidden
  // from the "from phone" section to avoid duplicates.
  const dedupedDeviceContacts = useMemo(() => {
    const appNames = new Set(appContacts.map((c) => c.name.trim().toLowerCase()));
    return deviceContacts.filter((d) => !appNames.has(d.name.trim().toLowerCase()));
  }, [appContacts, deviceContacts]);

  const sections = useMemo<Section[]>(() => {
    const q = query.trim().toLowerCase();
    const matchName = (name: string) => !q || name.toLowerCase().includes(q);
    const matchPhone = (phone: string | null) =>
      !q || (normalizePhone(phone)?.includes(q.replace(/\D/g, '')) ?? false);

    const app = appContacts.filter((c) => matchName(c.name));
    const device = dedupedDeviceContacts.filter(
      (c) => matchName(c.name) || matchPhone(c.phone),
    );

    const result: Section[] = [];
    if (app.length > 0) {
      result.push({ key: 'app', title: t('contacts.sectionYourPeople'), data: app });
    }
    if (device.length > 0) {
      result.push({ key: 'phone', title: t('contacts.sectionFromPhone'), data: device });
    }
    return result;
  }, [appContacts, dedupedDeviceContacts, query, t]);

  const hasAnyContacts = appContacts.length > 0 || dedupedDeviceContacts.length > 0;
  const isEmpty = !hasAnyContacts && !query;
  const isSearchEmpty = sections.length === 0 && query.trim().length > 0;

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      {!isEmpty && (
        <TextInput
          style={[
            styles.searchInput,
            { color: theme.text, borderBottomColor: theme.text + '30' },
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={t('contacts.searchPlaceholder')}
          placeholderTextColor={theme.text + '60'}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      )}

      {!isEmpty && !query && (
        <Pressable
          style={[styles.followUpsLink, { borderBottomColor: theme.text + '20' }]}
          onPress={() => router.push('/followups')}
          accessibilityRole="button"
        >
          <Text style={[styles.followUpsLinkText, { color: theme.cta }]}>
            {t('followUps.viewAll')}
          </Text>
        </Pressable>
      )}

      {/* Contacts permission denied — surface a path to Settings without
          blocking the rest of the tab. */}
      {permission && !permission.granted && (
        <Pressable
          style={[styles.permissionBanner, { borderBottomColor: theme.text + '20' }]}
          onPress={() => permission.blocked && void Linking.openSettings()}
          accessibilityRole="button"
        >
          <Text style={[styles.permissionText, { color: theme.text + '99' }]}>
            {permission.blocked
              ? t('contacts.permissionOpenSettings')
              : t('contacts.permissionDenied')}
          </Text>
        </Pressable>
      )}

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {t('contacts.emptyTitle')}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>
            {t('contacts.emptyBody')}
          </Text>
        </View>
      ) : isSearchEmpty ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>
            {t('contacts.noSearchResults')}
          </Text>
        </View>
      ) : (
        <SectionList<ContactListItem | DeviceContact, Section>
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item, section }) =>
            section.key === 'app' ? (
              <AppContactRow item={item as ContactListItem} theme={theme} t={t} />
            ) : (
              <DeviceContactRow item={item as DeviceContact} theme={theme} />
            )
          }
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                { color: theme.text + '99', backgroundColor: theme.background },
              ]}
            >
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchInput: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    textTransform: 'lowercase',
  },
  list: {
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    ...Typography.caption,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: 4,
  },
  rowName: {
    ...Typography.body,
    fontFamily: FONT_BOLD,
  },
  rowMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
  emptyBody: {
    ...Typography.body,
    textAlign: 'center',
  },
  followUpsLink: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  followUpsLinkText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  permissionBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  permissionText: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
});
