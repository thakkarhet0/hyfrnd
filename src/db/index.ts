import { openAsync } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';

import { getOrCreateEncryptionKey } from './encryption';
import migrations from './migrations';
import * as schema from './schema';

type Database = ReturnType<typeof drizzle<typeof schema>>;

let _db: Database | null = null;
let _initPromise: Promise<void> | null = null;

export function initializeDatabase(): Promise<void> {
  if (_initPromise !== null) return _initPromise;
  _initPromise = (async () => {
    const encryptionKey = await getOrCreateEncryptionKey();
    const client = await openAsync({ name: 'godsplan.db', encryptionKey });
    const db = drizzle(client, { schema });
    await migrate(db, migrations);
    _db = db;
  })().catch((err) => {
    _initPromise = null; // allow retry on next call
    throw err;
  });
  return _initPromise;
}

export function getDb(): Database {
  if (_db === null) {
    throw new Error('Database not initialized — call initializeDatabase() first');
  }
  return _db;
}
