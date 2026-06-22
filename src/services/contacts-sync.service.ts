// In SDK 56 the main `expo-contacts` module deprecated the imperative
// permission / query helpers (they throw at runtime). The stable equivalents
// live in the `/legacy` entry point, which is what we use here.
import {
  Fields,
  SortTypes,
  addContactsChangeListener,
  getContactsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-contacts/legacy';

export interface DeviceContact {
  /** Device contact id, prefixed so it never collides with app contact ids. */
  id: string;
  name: string;
  phone: string | null;
  photoUri: string | null;
}

export type ContactsPermission = {
  granted: boolean;
  /** True when the OS will no longer show a prompt (must deep-link to Settings). */
  blocked: boolean;
};

/** iOS 18 "limited" access still lets us read the selected contacts. */
function toPermission(res: {
  status: string;
  canAskAgain: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
}): ContactsPermission {
  const granted =
    res.status === 'granted' ||
    res.accessPrivileges === 'all' ||
    res.accessPrivileges === 'limited';
  return { granted, blocked: !granted && !res.canAskAgain };
}

export async function getContactsPermission(): Promise<ContactsPermission> {
  try {
    return toPermission(await getPermissionsAsync());
  } catch (err) {
    console.warn('[contacts-sync] getPermissionsAsync failed:', err);
    return { granted: false, blocked: false };
  }
}

export async function requestContactsPermission(): Promise<ContactsPermission> {
  try {
    return toPermission(await requestPermissionsAsync());
  } catch (err) {
    console.warn('[contacts-sync] requestPermissionsAsync failed:', err);
    return { granted: false, blocked: false };
  }
}

/**
 * Reads device contacts and normalizes them for display. Unnamed entries are
 * dropped. Sorted A–Z by name (the device API exposes no created/modified date,
 * so recency ordering isn't possible for pure device contacts).
 */
export async function fetchDeviceContacts(): Promise<DeviceContact[]> {
  try {
    const { data } = await getContactsAsync({
      fields: [Fields.Name, Fields.PhoneNumbers, Fields.Image],
      sort: SortTypes.FirstName,
    });

    const normalized: DeviceContact[] = [];
    for (const c of data) {
      const contact = toDeviceContact(c);
      if (contact) normalized.push(contact);
    }

    normalized.sort((a, b) => a.name.localeCompare(b.name));
    return normalized;
  } catch (err) {
    console.warn('[contacts-sync] fetchDeviceContacts failed:', err);
    return [];
  }
}

/**
 * Finds device contacts whose name contains `query`. Returns [] if permission
 * isn't granted. Used by the capture linking flow to surface phone contacts that
 * match a name recognized from the transcript.
 */
export async function findDeviceContactsByName(
  query: string,
  limit = 5,
): Promise<DeviceContact[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  try {
    const perm = await getContactsPermission();
    if (!perm.granted) return [];

    const { data } = await getContactsAsync({
      fields: [Fields.Name, Fields.PhoneNumbers, Fields.Image],
      name: query.trim(),
    });

    const matches: DeviceContact[] = [];
    for (const c of data) {
      const contact = toDeviceContact(c);
      if (!contact || !contact.name.toLowerCase().includes(needle)) continue;
      matches.push(contact);
      if (matches.length >= limit) break;
    }
    return matches;
  } catch (err) {
    console.warn('[contacts-sync] findDeviceContactsByName failed:', err);
    return [];
  }
}

function toDeviceContact(c: {
  id: string;
  name?: string;
  phoneNumbers?: { number?: string }[];
  imageAvailable?: boolean;
  image?: { uri?: string };
}): DeviceContact | null {
  const name = (c.name ?? '').trim();
  if (!name) return null;
  return {
    id: `device:${c.id}`,
    name,
    phone: c.phoneNumbers?.[0]?.number ?? null,
    photoUri: c.imageAvailable && c.image?.uri ? c.image.uri : null,
  };
}

export function addDeviceContactsListener(
  listener: () => void,
): ReturnType<typeof addContactsChangeListener> {
  return addContactsChangeListener(listener);
}
