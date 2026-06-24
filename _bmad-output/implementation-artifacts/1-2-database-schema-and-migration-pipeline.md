# Story 1.2: Database Schema and Migration Pipeline

Status: done

## Story

As a developer,
I want the complete Drizzle schema defined and the migration pipeline established,
So that all stories can write to a typed, versioned database from day one.

## Acceptance Criteria

1. **Given** Story 1.1 is complete **When** `src/db/schema.ts` is created with all tables **Then** the schema defines: `contacts`, `memos`, `context_points`, `follow_ups`, `stt_queue`, `consent_state` with the correct columns and types
2. **And** `consent_state` includes a `consent_version INTEGER` column (FR44)
3. **And** `drizzle.config.ts` (at repo root) points to `src/db/schema.ts` and `src/db/migrations/`
4. **And** `drizzle-kit generate` produces the initial migration SQL file in `src/db/migrations/`
5. **And** `src/db/index.ts` opens the op-sqlite database (without encryption — encryption added in Story 1.3) and runs all pending migrations via Drizzle's migrate()
6. **And** `src/app/_layout.tsx` calls `initializeDatabase()` from `src/db/index.ts` before any screen renders, keeping the native splash screen visible until the DB is ready
7. **And** the app cold-starts and all migrations apply without error on a fresh install
8. **And** `npx tsc --noEmit` passes with zero errors and `npm run lint` passes with zero warnings

## Tasks / Subtasks

- [x] Task 1: Write `src/db/schema.ts` with all six tables (AC: 1, 2)
  - [x] Define `contacts` table: `id TEXT PRIMARY KEY`, `name TEXT NOT NULL`, `phone TEXT`, `photo_uri TEXT`, `created_at INTEGER NOT NULL`, `updated_at INTEGER NOT NULL`
  - [x] Define `memos` table: `id TEXT PRIMARY KEY`, `contact_id TEXT REFERENCES contacts(id)`, `audio_path TEXT NOT NULL`, `raw_transcript TEXT`, `status TEXT NOT NULL DEFAULT 'pending'` (pending/extracted/failed), `created_at INTEGER NOT NULL`
  - [x] Define `context_points` table: `id TEXT PRIMARY KEY`, `memo_id TEXT NOT NULL REFERENCES memos(id)`, `content TEXT NOT NULL`, `created_at INTEGER NOT NULL`
  - [x] Define `follow_ups` table: `id TEXT PRIMARY KEY`, `contact_id TEXT NOT NULL REFERENCES contacts(id)`, `memo_id TEXT REFERENCES memos(id)`, `due_date INTEGER NOT NULL`, `status TEXT NOT NULL DEFAULT 'pending'` (pending/completed/snoozed), `context_snapshot TEXT`, `created_at INTEGER NOT NULL`
  - [x] Define `stt_queue` table: `id TEXT PRIMARY KEY`, `memo_id TEXT NOT NULL REFERENCES memos(id)`, `audio_path TEXT NOT NULL`, `attempts INTEGER NOT NULL DEFAULT 0`, `status TEXT NOT NULL DEFAULT 'pending'` (pending/processing/completed/failed), `created_at INTEGER NOT NULL`
  - [x] Define `consent_state` table: `id INTEGER PRIMARY KEY DEFAULT 1`, `stt_consent_granted INTEGER NOT NULL DEFAULT 0` (0/1 boolean), `consent_version INTEGER NOT NULL DEFAULT 0`, `updated_at INTEGER NOT NULL`

- [x] Task 2: Configure `drizzle.config.ts` at repo root (AC: 3)
  - [x] Create `drizzle.config.ts` with `dialect: 'sqlite'`, `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`
  - [x] Add `dbCredentials: { url: './local.db' }` (used only for direct drizzle-kit introspection, not at runtime)

- [x] Task 3: Configure Metro to handle `.sql` file imports (prerequisite for Task 4)
  - [x] Create `metro.config.js` at repo root using `expo/metro-config` base
  - [x] Add `'sql'` to `config.resolver.sourceExts` so Metro can import `.sql` files as strings
  - [x] Verify `npx expo start` still launches without error after metro config change

- [x] Task 4: Generate initial migration and create migrations bundle (AC: 4)
  - [x] Run `npx drizzle-kit generate` to produce `src/db/migrations/0000_*.sql` and `src/db/migrations/_journal.json`
  - [x] Create `src/db/migrations/index.ts` that exports the bundled migrations object: `{ journal, migrations }` using static imports of the SQL files and `_journal.json`
  - [x] Verify the generated SQL contains `CREATE TABLE` statements for all 6 tables

- [x] Task 5: Create `src/db/index.ts` — DB open + migrate (AC: 5)
  - [x] Import `open` from `@op-engineering/op-sqlite` and `drizzle` from `drizzle-orm/op-sqlite`
  - [x] Import `migrate` from `drizzle-orm/op-sqlite/migrator` and migrations bundle from `./migrations`
  - [x] Export `initializeDatabase(): Promise<void>` that opens the DB with `open({ name: 'godsplan.db' })` (no `encryptionKey` — Story 1.3 adds this)
  - [x] Call `await migrate(db, migrations)` after opening
  - [x] Export the `db` instance (typed with schema) for use in query files
  - [x] Function returns `{ data: void; error: Error | null }` shape — never throws

- [x] Task 6: Wire DB init into `src/app/_layout.tsx` behind splash screen (AC: 6)
  - [x] Import `* as SplashScreen from 'expo-splash-screen'` and call `SplashScreen.preventAutoHideAsync()` at module scope (outside the component)
  - [x] Add `useState(false)` for `dbReady` and a `useEffect` that calls `initializeDatabase()`, then sets `dbReady(true)` and calls `SplashScreen.hideAsync()`
  - [x] Return `null` from the component while `dbReady` is false (splash stays visible)
  - [x] Preserve the existing `ThemeProvider` + `Stack` structure from Story 1.1 — wrap it in the `dbReady` guard
  - [x] On DB init error: log the error, still call `SplashScreen.hideAsync()` and set `dbReady(true)` so the app doesn't hang on the splash screen

- [x] Task 7: Validate end-to-end (AC: 7, 8)
  - [x] `npx tsc --noEmit` passes with zero errors
  - [x] `npm run lint` passes with zero warnings
  - [x] `npx expo start` launches without crash; check Metro logs confirm DB opened and migrations applied on first run

## Dev Notes

### CRITICAL: All paths use `src/` prefix

The architecture doc shows paths without `src/` (e.g. `db/schema.ts`) but the actual project uses `src/` everywhere (established in Story 1.1). Correct paths:

| Architecture doc says | Actual path |
|---|---|
| `db/schema.ts` | `src/db/schema.ts` |
| `db/index.ts` | `src/db/index.ts` |
| `db/migrations/` | `src/db/migrations/` |
| `db/queries/` | `src/db/queries/` |
| `app/_layout.tsx` | `src/app/_layout.tsx` |

Import alias `@/` maps to `./src/` — use `@/db` not `../../db`.

`drizzle.config.ts` is the ONLY file at repo root (not in `src/`).

### op-sqlite v16 API (installed: `@op-engineering/op-sqlite` v16.2.0)

```typescript
import { open } from '@op-engineering/op-sqlite';

// Open without encryption (Story 1.2)
const client = open({ name: 'godsplan.db' });

// Open with encryption (Story 1.3 will change this)
const client = open({ name: 'godsplan.db', encryptionKey: 'secret' });

// Check if SQLCipher is built in (use in Story 1.3)
import { isSQLCipher } from '@op-engineering/op-sqlite';
```

The `open()` call is synchronous and returns a DB client immediately. The database file is stored in the app's default document directory.

### Drizzle ORM + op-sqlite (installed: `drizzle-orm` v0.45.2)

```typescript
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';

const db = drizzle(client, { schema });
// db is typed: OPSQLiteDatabase<typeof schema>
```

Export `db` as a module-level singleton — components import it directly, no React context needed.

### Migration runtime: `drizzle-orm/op-sqlite/migrator`

The `MigrationConfig` type:
```typescript
interface MigrationConfig {
  journal: {
    entries: { idx: number; when: number; tag: string; breakpoints: boolean }[];
  };
  migrations: Record<string, string>; // tag → SQL string
}
```

Usage:
```typescript
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import migrations from './migrations'; // bundled index.ts

await migrate(db, migrations);
```

`migrate()` is idempotent — it tracks applied migrations in a `__drizzle_migrations` table and only runs new ones. Safe to call on every app startup.

### Migration bundling for Metro

Metro cannot import `.sql` files as strings by default. Two steps required:

**Step 1 — `metro.config.js`:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
```

**Step 2 — `src/db/migrations/index.ts`** (hand-crafted, not auto-generated):
```typescript
import journal from './_journal.json';
import m0000 from './0000_initial_schema.sql';
// Add one import per generated .sql file as they are added in future stories

export default {
  journal,
  migrations: {
    '0000_initial_schema': m0000,
  },
} as const;
```

The SQL file name key in `migrations` must match the filename without `.sql` extension, exactly matching the `tag` field in `_journal.json`.

**Important:** After running `drizzle-kit generate`, check the actual filename of the generated `.sql` file and `_journal.json` entries to set the correct key in `migrations/index.ts`.

TypeScript will complain about `.sql` imports — declare the module type. Create `src/types/sql.d.ts`:
```typescript
declare module '*.sql' {
  const content: string;
  export default content;
}
```

### `drizzle.config.ts` (at repo root, not in `src/`)

```typescript
import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: './local.db',
  },
} satisfies Config;
```

Note: `driver: 'op-sqlite'` is NOT a valid drizzle-kit v0.31.10 driver option (valid drivers: `d1-http`, `expo`, `aws-data-api`, `pglite`, `durable-sqlite`). Use `dialect: 'sqlite'` only — drizzle-kit doesn't need to connect to op-sqlite for schema generation.

### Schema implementation with Drizzle table builders

Use Drizzle's `sqliteTable` from `drizzle-orm/sqlite-core`:

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  photo_uri: text('photo_uri'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
});

export const memos = sqliteTable('memos', {
  id: text('id').primaryKey(),
  contact_id: text('contact_id').references(() => contacts.id),
  audio_path: text('audio_path').notNull(),
  raw_transcript: text('raw_transcript'),
  status: text('status', { enum: ['pending', 'extracted', 'failed'] }).notNull().default('pending'),
  created_at: integer('created_at').notNull(),
});

export const context_points = sqliteTable('context_points', {
  id: text('id').primaryKey(),
  memo_id: text('memo_id').notNull().references(() => memos.id),
  content: text('content').notNull(),
  created_at: integer('created_at').notNull(),
});

export const follow_ups = sqliteTable('follow_ups', {
  id: text('id').primaryKey(),
  contact_id: text('contact_id').notNull().references(() => contacts.id),
  memo_id: text('memo_id').references(() => memos.id),
  due_date: integer('due_date').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'snoozed'] }).notNull().default('pending'),
  context_snapshot: text('context_snapshot'),
  created_at: integer('created_at').notNull(),
});

export const stt_queue = sqliteTable('stt_queue', {
  id: text('id').primaryKey(),
  memo_id: text('memo_id').notNull().references(() => memos.id),
  audio_path: text('audio_path').notNull(),
  attempts: integer('attempts').notNull().default(0),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull().default('pending'),
  created_at: integer('created_at').notNull(),
});

export const consent_state = sqliteTable('consent_state', {
  id: integer('id').primaryKey().default(1),
  stt_consent_granted: integer('stt_consent_granted').notNull().default(0),
  consent_version: integer('consent_version').notNull().default(0),
  updated_at: integer('updated_at').notNull(),
});
```

All timestamps stored as Unix epoch integers (milliseconds from `Date.now()`). All IDs are `TEXT` generated by `nanoid()` — except `consent_state.id` which is always `1` (singleton row).

### `src/db/index.ts` pattern

```typescript
import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import * as schema from './schema';
import migrations from './migrations';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function initializeDatabase(): Promise<void> {
  // Story 1.3 will add: const key = await SecureStore.getItemAsync('db_encryption_key');
  // and pass it as encryptionKey to open()
  const client = open({ name: 'godsplan.db' });
  _db = drizzle(client, { schema });
  await migrate(_db, migrations);
}

export function getDb() {
  if (!_db) throw new Error('Database not initialized — call initializeDatabase() first');
  return _db;
}

// Named export for convenience in query files
export { _db as db };
```

The `getDb()` guard ensures nothing can access the DB before migrations complete.

### `src/app/_layout.tsx` — DB init behind splash screen

Current file (after Story 1.1):
```tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

After Story 1.2:
```tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { initializeDatabase } from '@/db';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => {
        setDbReady(true);
        SplashScreen.hideAsync();
      })
      .catch((error: unknown) => {
        console.error('[DB] Initialization failed:', error);
        setDbReady(true); // Don't hang on splash — show error state
        SplashScreen.hideAsync();
      });
  }, []);

  if (!dbReady) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

`preventAutoHideAsync()` must be called at module scope (not inside the component). Expo SDK 56 will warn if called after module load completes.

### Architecture: Encryption boundary

**This story (1.2):** Opens op-sqlite WITHOUT `encryptionKey`. DB is unencrypted. This is intentional — establishes the migration pipeline first.

**Story 1.3:** Will generate a unique key with `expo-crypto`, store it in `expo-secure-store`, and reopen the DB with `open({ name: 'godsplan.db', encryptionKey: key })`. Story 1.3 modifies ONLY `src/db/index.ts` — the schema, migrations, and _layout.tsx stay untouched.

Leave a clear comment in `initializeDatabase()` marking where Story 1.3 will insert the key retrieval.

### Architecture: Date/time storage

All `_at` columns are `INTEGER` storing Unix milliseconds (`Date.now()`). Convert to/from `Date` objects at the query boundary — never store Date objects in the DB directly.

### What NOT to do in this story

- Do NOT implement `src/db/queries/` files — those are created story-by-story as features need them
- Do NOT implement any Zustand stores — that's Story 1.2's successor stories
- Do NOT add expo-secure-store key retrieval — that's Story 1.3
- Do NOT implement any i18n — that's Story 1.4
- Do NOT create any UI beyond the existing placeholder tabs

### Files created/modified in this story

**New files:**
- `src/db/schema.ts`
- `src/db/index.ts`
- `src/db/migrations/` (generated by drizzle-kit + hand-crafted index.ts)
- `src/db/migrations/_journal.json` (generated)
- `src/db/migrations/0000_*.sql` (generated)
- `src/db/migrations/index.ts` (hand-crafted bundler)
- `src/types/sql.d.ts` (module declaration for .sql imports)
- `drizzle.config.ts` (repo root)
- `metro.config.js` (repo root)

**Modified files:**
- `src/app/_layout.tsx` (add DB init + splash screen guard)

### Running drizzle-kit generate

```bash
# From the gods-plan/ directory
npx drizzle-kit generate
```

This reads `drizzle.config.ts`, generates SQL from `src/db/schema.ts`, and writes to `src/db/migrations/`. The generated SQL file name includes a random suffix — after generation, update `src/db/migrations/index.ts` with the correct filename.

### References

- Architecture: Data Architecture [Source: architecture.md#Data-Architecture]
- Architecture: Migration strategy [Source: architecture.md#Data-Architecture]
- Architecture: Startup/cold start masking [Source: architecture.md#Infrastructure-Deployment]
- Architecture: Critical invariants — migration-first [Source: architecture.md#Critical-Invariants]
- Architecture: Complete project structure [Source: architecture.md#Complete-Project-Directory-Structure]
- Epic 1: Story 1.2 acceptance criteria [Source: epics/epic-1-project-foundation.md#Story-1.2]
- Story 1.1: All paths use `src/` prefix [Source: 1-1-project-initialization-and-app-shell.md#Completion-Notes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- drizzle-kit v0.31.10 does NOT support `driver: 'op-sqlite'` — valid drivers are `d1-http`, `expo`, `aws-data-api`, `pglite`, `durable-sqlite`. Used `dialect: 'sqlite'` only.
- drizzle-kit generates `_journal.json` inside `src/db/migrations/meta/` (not directly in `src/db/migrations/`). The `migrations/index.ts` references `meta/_journal.json` pattern.
- Metro cannot import `.sql` files as strings via `sourceExts` (Metro tries to parse as JS → syntax error). Used inlined SQL strings in `migrations/index.ts` instead — avoids any Metro transformer complexity.
- `open()` from op-sqlite v16 is synchronous; `migrate()` from drizzle-orm is async — `initializeDatabase()` is correctly async.

### Completion Notes List

- `src/db/schema.ts`: All 6 tables defined with `sqliteTable` from `drizzle-orm/sqlite-core`. `consent_state.consent_version INTEGER` satisfies FR44. All timestamps as `INTEGER` (Unix ms). All IDs as `TEXT` except `consent_state.id` (singleton INTEGER = 1).
- `drizzle.config.ts`: `dialect: 'sqlite'`, `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`, `dbCredentials.url: './local.db'`.
- `npx drizzle-kit generate` produced `src/db/migrations/0000_lonely_famine.sql` and `src/db/migrations/meta/_journal.json` with 6 CREATE TABLE statements.
- `src/db/migrations/index.ts`: Bundles SQL as an inlined TypeScript string constant. Journal entry matches the generated meta/_journal.json. No Metro transforms needed.
- `metro.config.js`: Created at repo root with `expo/metro-config` base — no sql sourceExts needed since SQL is inlined in TS.
- `src/db/index.ts`: Exports `initializeDatabase()` (opens DB without encryption, runs migrations) and `getDb()` (throws if called before init). Comment marks where Story 1.3 will add SQLCipher key.
- `src/app/_layout.tsx`: `SplashScreen.preventAutoHideAsync()` called at module scope. `useEffect` calls `initializeDatabase()`, sets `dbReady`, hides splash. Returns `null` while DB not ready — splash stays visible. ThemeProvider + Stack preserved from Story 1.1.
- `npx tsc --noEmit` passes zero errors. `npm run lint` passes zero warnings.
- Post-review fixes applied: idempotency guard added to `initializeDatabase()`; switched `open()` → `openAsync()`; added user-visible error UI to `_layout.tsx` catch branch; added `.$defaultFn(() => nanoid())` to all 5 entity table ID columns in schema; added SQLite CHECK constraints on all enum-typed status columns in migration SQL; added `INSERT OR IGNORE INTO consent_state` seed row; synced `migrations/index.ts` bundle string to match updated SQL.

### File List

- `gods-plan/src/db/schema.ts` (new)
- `gods-plan/src/db/index.ts` (new)
- `gods-plan/src/db/migrations/index.ts` (new — bundled migrations)
- `gods-plan/src/db/migrations/0000_lonely_famine.sql` (generated by drizzle-kit)
- `gods-plan/src/db/migrations/meta/_journal.json` (generated by drizzle-kit)
- `gods-plan/src/db/migrations/meta/0000_snapshot.json` (generated by drizzle-kit)
- `gods-plan/drizzle.config.ts` (new)
- `gods-plan/metro.config.js` (new)
- `gods-plan/src/app/_layout.tsx` (modified — added DB init + splash screen guard)
