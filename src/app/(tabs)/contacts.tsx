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

import { Typography, FONT_REGULAR, FONT_BOLD, Spacing, INK } from '@/constants/theme';
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

type AnyTheme = {
  background: string;
  text: string;
  cta: string;
  accent: string;
  highlight: string;
};

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
  isLast,
}: {
  item: ContactListItem;
  theme: AnyTheme;
  t: (key: string) => string;
  isLast: boolean;
}) {
  return (
    <Pressable
      style={[styles.row, blockSides(theme, isLast)]}
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
          <View style={[styles.followUpChip, { backgroundColor: INK }]}>
            <Text style={[styles.followUpChipText, { color: theme.highlight }]}>
              {t('contacts.followUpOn')} {formatDate(item.next_follow_up)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function DeviceContactRow({
  item,
  theme,
  isLast,
}: {
  item: DeviceContact;
  theme: AnyTheme;
  isLast: boolean;
}) {
  return (
    <View style={[styles.row, blockSides(theme, isLast)]}>
      <Text style={[styles.rowName, { color: theme.text }]}>{item.name}</Text>
      {item.phone ? (
        <Text style={[styles.metaText, { color: theme.text + '80' }]}>{item.phone}</Text>
      ) : null}
    </View>
  );
}

// Left/right walls of a section block, with an inner separator below every row
// except the last (the footer draws the closing bottom edge).
function blockSides(theme: AnyTheme, isLast: boolean) {
  return {
    backgroundColor: theme.text + '06',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: theme.text + '20',
    borderRightColor: theme.text + '20',
    borderBottomWidth: isLast ? 0 : 1,
    borderBottomColor: theme.text + '10',
  };
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
    <Screen style={styles.container}>
      {!isEmpty && (
        <View
          style={[
            styles.searchBox,
            { borderColor: theme.text + '20', backgroundColor: theme.text + '06' },
          ]}
        >
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('contacts.searchPlaceholder')}
            placeholderTextColor={theme.text + '60'}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      )}

      {!isEmpty && !query && (
        <Pressable
          style={({ pressed }) => [
            styles.followUpsCta,
            { backgroundColor: theme.highlight, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push('/(tabs)/calendar')}
          accessibilityRole="button"
        >
          <Text style={styles.followUpsCtaText}>{t('followUps.viewAll')}</Text>
          <Text style={styles.followUpsCtaArrow}>→</Text>
        </Pressable>
      )}

      {/* Contacts permission denied — surface a path to Settings without
          blocking the rest of the tab. */}
      {permission && !permission.granted && (
        <Pressable
          style={[
            styles.permissionBanner,
            { borderColor: theme.text + '20', backgroundColor: theme.text + '06' },
          ]}
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
          renderItem={({ item, section, index }) => {
            const isLast = index === section.data.length - 1;
            return section.key === 'app' ? (
              <AppContactRow
                item={item as ContactListItem}
                theme={theme}
                t={t}
                isLast={isLast}
              />
            ) : (
              <DeviceContactRow
                item={item as DeviceContact}
                theme={theme}
                isLast={isLast}
              />
            );
          }}
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionHeader,
                {
                  backgroundColor: theme.text + '06',
                  borderTopColor: theme.text + '20',
                  borderLeftColor: theme.text + '20',
                  borderRightColor: theme.text + '20',
                },
              ]}
            >
              <View style={[styles.accentBar, { backgroundColor: theme.highlight }]} />
              <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderSectionFooter={() => (
            <View
              style={[
                styles.sectionFooter,
                {
                  backgroundColor: theme.text + '06',
                  borderBottomColor: theme.text + '20',
                  borderLeftColor: theme.text + '20',
                  borderRightColor: theme.text + '20',
                },
              ]}
            />
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
  searchBox: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  searchInput: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    paddingVertical: Spacing.sm,
    textTransform: 'lowercase',
  },
  list: {
    paddingBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  accentBar: {
    width: 4,
    height: 14,
    marginRight: Spacing.sm,
  },
  sectionHeaderText: {
    ...Typography.label,
  },
  sectionFooter: {
    marginHorizontal: Spacing.lg,
    height: Spacing.sm,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  row: {
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  rowName: {
    ...Typography.body,
    fontFamily: FONT_BOLD,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaText: {
    fontFamily: FONT_REGULAR,
    fontSize: 16,
    textTransform: 'lowercase',
  },
  followUpChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  followUpChipText: {
    fontFamily: FONT_BOLD,
    fontSize: 13,
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
  followUpsCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: INK,
  },
  followUpsCtaText: {
    fontFamily: FONT_BOLD,
    fontSize: 16,
    color: INK,
    textTransform: 'lowercase',
  },
  followUpsCtaArrow: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    color: INK,
  },
  permissionBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  permissionText: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
});
