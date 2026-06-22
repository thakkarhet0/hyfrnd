import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { sql } from 'drizzle-orm';

import { getDb } from '@/db/index';

const DB_KEY_STORE = 'db_encryption_key';
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

export function generateEncryptionKey(): string {
  const bytes = Crypto.getRandomBytes(32);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(DB_KEY_STORE, KEYCHAIN_OPTIONS);
  if (key === null) {
    key = generateEncryptionKey();
    await SecureStore.setItemAsync(DB_KEY_STORE, key, KEYCHAIN_OPTIONS);
  }
  return key;
}

export async function rotateEncryptionKey(): Promise<void> {
  const newKey = generateEncryptionKey();
  await getDb().run(sql.raw(`PRAGMA rekey = '${newKey}'`));
  await SecureStore.setItemAsync(DB_KEY_STORE, newKey, KEYCHAIN_OPTIONS);
}
