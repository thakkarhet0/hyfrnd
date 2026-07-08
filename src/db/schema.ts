import { nanoid } from 'nanoid';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  phone: text('phone'),
  photo_uri: text('photo_uri'),
  created_at: integer('created_at').notNull(),
  updated_at: integer('updated_at').notNull(),
});

export const memos = sqliteTable('memos', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  contact_id: text('contact_id').references(() => contacts.id),
  audio_path: text('audio_path').notNull(),
  raw_transcript: text('raw_transcript'),
  status: text('status', { enum: ['pending', 'extracted', 'failed'] })
    .notNull()
    .default('pending'),
  created_at: integer('created_at').notNull(),
});

export const context_points = sqliteTable('context_points', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  memo_id: text('memo_id')
    .notNull()
    .references(() => memos.id),
  content: text('content').notNull(),
  created_at: integer('created_at').notNull(),
});

export const follow_ups = sqliteTable('follow_ups', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  contact_id: text('contact_id')
    .notNull()
    .references(() => contacts.id),
  memo_id: text('memo_id').references(() => memos.id),
  due_date: integer('due_date').notNull(),
  status: text('status', { enum: ['pending', 'completed', 'snoozed'] })
    .notNull()
    .default('pending'),
  context_snapshot: text('context_snapshot'),
  created_at: integer('created_at').notNull(),
});

export const stt_queue = sqliteTable('stt_queue', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  memo_id: text('memo_id')
    .notNull()
    .references(() => memos.id),
  audio_path: text('audio_path').notNull(),
  attempts: integer('attempts').notNull().default(0),
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
    .notNull()
    .default('pending'),
  created_at: integer('created_at').notNull(),
});

export const consent_state = sqliteTable('consent_state', {
  id: integer('id').primaryKey().default(1),
  stt_consent_granted: integer('stt_consent_granted').notNull().default(0),
  consent_version: integer('consent_version').notNull().default(0),
  updated_at: integer('updated_at').notNull(),
});

export const app_prefs = sqliteTable('app_prefs', {
  id: integer('id').primaryKey().default(1),
  language: text('language').notNull().default('hi'),
  theme_preference: text('theme_preference', { enum: ['system', 'light', 'dark'] })
    .notNull()
    .default('system'),
  onboarding_step: text('onboarding_step'),
  onboarding_complete: integer('onboarding_complete').notNull().default(0),
  last_app_open: integer('last_app_open'),
  nudge_morning_hour: integer('nudge_morning_hour').notNull().default(8),
  nudge_afternoon_hour: integer('nudge_afternoon_hour').notNull().default(13),
  nudge_evening_hour: integer('nudge_evening_hour').notNull().default(21),
  backup_enabled: integer('backup_enabled').notNull().default(0),
  last_backup_at: integer('last_backup_at'),
  last_backup_error: text('last_backup_error'),
  updated_at: integer('updated_at').notNull(),
});

export const extraction_logs = sqliteTable('extraction_logs', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  memo_id: text('memo_id'),
  raw_transcript: text('raw_transcript'),
  extracted_name: text('extracted_name'),
  extracted_context_points: text('extracted_context_points'),
  extracted_follow_up_date: text('extracted_follow_up_date'),
  extracted_follow_up_intent: text('extracted_follow_up_intent'),
  audio_path: text('audio_path'),
  created_at: integer('created_at').notNull(),
});

