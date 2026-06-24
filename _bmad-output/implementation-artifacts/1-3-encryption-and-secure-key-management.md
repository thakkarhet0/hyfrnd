# Story 1.3: Encryption and Secure Key Management

Status: done

## Story

As a developer,
I want SQLCipher encryption active with a device-bound key stored in expo-secure-store,
so that all user data is encrypted at rest from the first write (NFR7).

## Acceptance Criteria

1. **Given** the app launches for the first time **When** `initializeDatabase()` runs **Then** a 256-bit cryptographically secure random key is generated using `crypto.getRandomValues()`
2. **And** the generated key is stored in `expo-secure-store` under the key `'db_encryption_key'` before `openAsync` is called
3. **And** `openAsync` is called with `{ name: 'godsplan.db', encryptionKey: <key> }` — the database is created encrypted from first open
4. **Given** the app relaunches **When** `initializeDatabase()` runs **Then** the existing key is retrieved from `expo-secure-store` via `getItemAsync('db_encryption_key')` and the database opens successfully with no migration errors
5. **And** no key material (the 64-char hex string) appears in any `console.log`, `console.error`, or error message — error messages log only a safe, non-sensitive description
6. **And** `npx tsc --noEmit` passes with zero errors and `npm run lint` passes with zero warnings

## Tasks / Subtasks

- [x] Task 1: Create `src/db/encryption.ts` with key generation and retrieval logic (AC: 1, 2, 4, 5)
  - [x] Export `getOrCreateEncryptionKey(): Promise<string>` — calls `SecureStore.getItemAsync('db_encryption_key')`; if null, generates a 32-byte hex key via `crypto.getRandomValues()`, stores it with `SecureStore.setItemAsync`, then returns it
  - [x] Export `generateEncryptionKey(): string` as a pure function (no side effects) — generates and returns 64-char lowercase hex string from `crypto.getRandomValues(new Uint8Array(32))`; keep exported for testability
  - [x] Ensure neither function logs key material under any code path
- [x] Task 2: Update `src/db/index.ts` to use the encryption key (AC: 3, 4)
  - [x] Import `getOrCreateEncryptionKey` from `./encryption`
  - [x] Remove the Story 1.3 TODO comment
  - [x] Call `await getOrCreateEncryptionKey()` and pass result as `encryptionKey` to `openAsync`
  - [x] Ensure error catch path in `_layout.tsx` (unchanged) does not surface key material — verify the error message from `initializeDatabase` is a safe string
- [x] Task 3: Validate (AC: 6)
  - [x] Run `npx tsc --noEmit` — zero errors
  - [x] Run `npm run lint` — zero warnings

## Dev Notes

### Architecture Requirements

- **NFR7**: AES-256 at rest via SQLCipher — mandatory, not optional. All data must be encrypted from the first write.
- **Key storage**: `expo-secure-store` uses iOS Keychain and Android Keystore — OS-level secure enclave. Key never leaves the device.
- **Key lifecycle**: Generate once on first launch, retrieve on every subsequent launch. Key is permanent — there is no rotation story in Epic 1.
- **Key name constant**: Use `'db_encryption_key'` (matches architecture style: `google_drive_token` uses underscore notation).
- [Source: _bmad-output/planning-artifacts/architecture.md — "Encryption key management" section, line 176]
- [Source: _bmad-output/planning-artifacts/architecture.md — "Storage" section, line 50]

### File to Modify

**`src/db/index.ts`** — current state (from Story 1.2):
```typescript
import { openAsync } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import migrations from './migrations';
import * as schema from './schema';

type Database = ReturnType<typeof drizzle<typeof schema>>;

let _db: Database | null = null;

export async function initializeDatabase(): Promise<void> {
  if (_db !== null) return;
  // Story 1.3: retrieve SQLCipher key from expo-secure-store and pass as encryptionKey
  const client = await openAsync({ name: 'godsplan.db' });
  _db = drizzle(client, { schema });
  await migrate(_db, migrations);
}

export function getDb(): Database {
  if (_db === null) {
    throw new Error('Database not initialized — call initializeDatabase() first');
  }
  return _db;
}
```

What this story changes:
- Remove the TODO comment
- Import `getOrCreateEncryptionKey` from `./encryption`
- Pass `encryptionKey` to `openAsync`

What must be preserved:
- Idempotency guard (`if (_db !== null) return;`)
- `openAsync` (not synchronous `open`)
- `drizzle(client, { schema })` shape
- `migrate(_db, migrations)` call
- `getDb()` export and its throw

### New File: `src/db/encryption.ts`

Create this new file to isolate encryption logic for testability:

```typescript
import * as SecureStore from 'expo-secure-store';

const DB_KEY_STORE = 'db_encryption_key';

export function generateEncryptionKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function getOrCreateEncryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(DB_KEY_STORE);
  if (key === null) {
    key = generateEncryptionKey();
    await SecureStore.setItemAsync(DB_KEY_STORE, key);
  }
  return key;
}
```

### API Details

**`expo-secure-store` v56 (`expo-secure-store: ~56.0.4`)**
- Already installed — no `npx expo install` needed
- Import: `import * as SecureStore from 'expo-secure-store';`
- `SecureStore.getItemAsync(key: string): Promise<string | null>` — returns `null` if not set
- `SecureStore.setItemAsync(key: string, value: string): Promise<void>`
- On iOS: stored in Keychain with `kSecAttrAccessibleAfterFirstUnlock` (survives reboot, requires unlock)
- On Android: stored in Keystore-backed EncryptedSharedPreferences

**`@op-engineering/op-sqlite` v16 (`@op-engineering/op-sqlite: ^16.2.0`)**
- Already installed
- `openAsync({ name: string, encryptionKey?: string }): Promise<OPSQLiteConnection>`
- `encryptionKey` is passed directly as the SQLCipher passphrase — SQLCipher derives the AES-256 key from it via PBKDF2
- If `encryptionKey` is omitted or empty string, DB is unencrypted (current Story 1.2 behavior)

**`crypto.getRandomValues` in Hermes (Expo SDK 56 / React Native 0.76)**
- Available globally — no import, no polyfill needed
- `crypto.getRandomValues(new Uint8Array(32))` — fills with CSPRNG bytes
- This is the Web Crypto API, natively supported in Hermes since React Native 0.76

### Security Constraints

- **Never log the key** — not even partially. If an error occurs, log a safe message like `'DB key retrieval failed'`, not the key value.
- **Never include key in Error messages** — the error thrown by `initializeDatabase` propagates to `_layout.tsx` which renders it on screen. Do not include key material in any thrown error.
- **Key is 256 bits** — 32 bytes → 64 hex chars. Do not reduce entropy.

### Critical Dev Note: Unencrypted DB from Story 1.2

SQLCipher CANNOT open an existing unencrypted database with an encryption key — it will throw an error. If you have a `godsplan.db` file from testing Story 1.2 (created without encryption), the app will fail to open the database after this story is implemented.

**Fix on development machine:**
- iOS Simulator: Simulator → Device → Erase All Content and Settings (or delete the app)
- Physical device: Settings → App → Delete App

Fresh installs are not affected — the DB is created encrypted from the very first `openAsync` call.

This is a development-only concern. In production, Story 1.3 ships before any user installs, so all databases are created encrypted from the start.

### No Test Runner

This project has no Jest or test runner configured (no `jest` in `package.json`). Automated tests cannot be written or run for this story. Validation is:
1. `npx tsc --noEmit` — zero errors
2. `npm run lint` — zero warnings
3. Manual verification on simulator (AC 3, 4 — open encrypted DB, relaunch successfully)

### Previous Story Learnings (Story 1.2)

- Import alias `@/` maps to `./src/` — use relative imports within `src/db/`
- `openAsync` is async — `initializeDatabase()` must remain async
- Error messages from `initializeDatabase` are rendered in `_layout.tsx` error UI — keep them safe (no key material)
- `npx tsc --noEmit` and `npm run lint` are the two validation commands
- File paths in the project use `src/` prefix (e.g., `src/db/index.ts`, not `db/index.ts`)

### Project Structure Notes

New file: `src/db/encryption.ts` — alongside `src/db/index.ts` and `src/db/schema.ts`.

Modified file: `src/db/index.ts` — only the import and `openAsync` call change. All exports preserved.

No schema changes, no migrations needed — encryption is a DB open-time option, not a schema change.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-1-project-foundation.md — Story 1.3 ACs]
- [Source: _bmad-output/planning-artifacts/architecture.md — "Encryption key management", line 176]
- [Source: _bmad-output/planning-artifacts/architecture.md — "SQLite Client" section, line 160-162]
- [Source: _bmad-output/implementation-artifacts/1-2-database-schema-and-migration-pipeline.md — Dev Agent Record, File List]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/db/encryption.ts` (new): Exports `generateEncryptionKey()` — pure function, 32-byte CSPRNG via `crypto.getRandomValues()`, returns 64-char lowercase hex string. Exports `getOrCreateEncryptionKey()` — reads `db_encryption_key` from expo-secure-store; generates and stores key on first launch; returns existing key on subsequent launches. No key material logged under any path.
- `src/db/index.ts` (modified): Imports `getOrCreateEncryptionKey` from `./encryption`. Removed Story 1.3 TODO comment. `openAsync` now receives `encryptionKey` — database created and opened encrypted from first call. Idempotency guard, `openAsync`, drizzle setup, and `migrate` call all preserved from Story 1.2.
- `_layout.tsx` verified: error UI shows the `Error.message` from `initializeDatabase`. Since `initializeDatabase` itself does not include key material in any thrown errors, AC 5 is satisfied.
- `npx tsc --noEmit` — zero errors. `npm run lint` — zero warnings.
- No test runner configured in project — automated tests not written. Validation: tsc + lint only.

### File List

- `gods-plan/src/db/encryption.ts` (new)
- `gods-plan/src/db/index.ts` (modified — in-flight promise guard, encryptionKey, _db after migrate)
- `gods-plan/app.config.ts` (modified — added @op-engineering/op-sqlite plugin with sqlcipher: true)

### Change Log

- Story 1.3 implemented: SQLCipher encryption active via expo-secure-store key management (2026-06-04)
- Post-review fixes applied: added @op-engineering/op-sqlite plugin with sqlcipher: true to app.config.ts (C1 — SQLCipher was silently not compiled in); replaced _db + async guard with in-flight promise pattern _initPromise ??= _doInit() (C2 — TOCTOU race on concurrent initializeDatabase calls); moved _db = drizzle() after await migrate() (C3 — partial-init poison state); added keychainAccessible: AFTER_FIRST_UNLOCK to all SecureStore calls (C4 — iOS background wakeup before first unlock)
