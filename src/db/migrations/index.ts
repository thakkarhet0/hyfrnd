// Bundled migrations for drizzle-orm/op-sqlite/migrator.
// Append new migrations as string constants and journal entries — never modify existing ones.
// IMPORTANT: the migrator looks up each entry by `m${idx padded to 4 digits}` (e.g. m0000),
// NOT by tag. Keys in the `migrations` object below MUST be m0000, m0001, … matching journal idx.

const m0000 = `
CREATE TABLE \`consent_state\` (
	\`id\` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	\`stt_consent_granted\` integer DEFAULT 0 NOT NULL,
	\`consent_version\` integer DEFAULT 0 NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`contacts\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL,
	\`phone\` text,
	\`photo_uri\` text,
	\`created_at\` integer NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`context_points\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`memo_id\` text NOT NULL,
	\`content\` text NOT NULL,
	\`created_at\` integer NOT NULL,
	FOREIGN KEY (\`memo_id\`) REFERENCES \`memos\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`follow_ups\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`contact_id\` text NOT NULL,
	\`memo_id\` text,
	\`due_date\` integer NOT NULL,
	\`status\` text DEFAULT 'pending' NOT NULL CHECK (\`status\` IN ('pending', 'completed', 'snoozed')),
	\`context_snapshot\` text,
	\`created_at\` integer NOT NULL,
	FOREIGN KEY (\`contact_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (\`memo_id\`) REFERENCES \`memos\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`memos\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`contact_id\` text,
	\`audio_path\` text NOT NULL,
	\`raw_transcript\` text,
	\`status\` text DEFAULT 'pending' NOT NULL CHECK (\`status\` IN ('pending', 'extracted', 'failed')),
	\`created_at\` integer NOT NULL,
	FOREIGN KEY (\`contact_id\`) REFERENCES \`contacts\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`stt_queue\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`memo_id\` text NOT NULL,
	\`audio_path\` text NOT NULL,
	\`attempts\` integer DEFAULT 0 NOT NULL,
	\`status\` text DEFAULT 'pending' NOT NULL CHECK (\`status\` IN ('pending', 'processing', 'completed', 'failed')),
	\`created_at\` integer NOT NULL,
	FOREIGN KEY (\`memo_id\`) REFERENCES \`memos\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT OR IGNORE INTO \`consent_state\` (\`id\`, \`stt_consent_granted\`, \`consent_version\`, \`updated_at\`) VALUES (1, 0, 0, 0);
`;

const m0001 = `
CREATE TABLE \`app_prefs\` (
	\`id\` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	\`language\` text DEFAULT 'hi' NOT NULL,
	\`onboarding_step\` text,
	\`onboarding_complete\` integer DEFAULT 0 NOT NULL,
	\`updated_at\` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO \`app_prefs\` (\`id\`, \`language\`, \`onboarding_step\`, \`onboarding_complete\`, \`updated_at\`) VALUES (1, 'hi', null, 0, 0);
`;

const m0002 = `
ALTER TABLE \`app_prefs\` ADD COLUMN \`last_app_open\` integer;
`;

const m0003 = `
ALTER TABLE \`app_prefs\` ADD COLUMN \`nudge_morning_hour\` integer NOT NULL DEFAULT 8;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`nudge_afternoon_hour\` integer NOT NULL DEFAULT 13;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`nudge_evening_hour\` integer NOT NULL DEFAULT 21;
`;

const m0004 = `
ALTER TABLE \`app_prefs\` ADD COLUMN \`backup_enabled\` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`last_backup_at\` integer;
--> statement-breakpoint
ALTER TABLE \`app_prefs\` ADD COLUMN \`last_backup_error\` text;
`;

const m0005 = `
ALTER TABLE \`app_prefs\` ADD COLUMN \`theme_preference\` text DEFAULT 'system' NOT NULL;
`;

const m0006 = `
CREATE TABLE \`extraction_logs\` (
	\`id\` text PRIMARY KEY NOT NULL,
	\`memo_id\` text,
	\`raw_transcript\` text,
	\`extracted_name\` text,
	\`extracted_context_points\` text,
	\`extracted_follow_up_date\` text,
	\`extracted_follow_up_intent\` text,
	\`audio_path\` text,
	\`created_at\` integer NOT NULL
);
`;

const migrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: 1780491004933,
        tag: '0000_lonely_famine',
        breakpoints: true,
      },
      {
        idx: 1,
        when: 1780491004934,
        tag: '0001_app_prefs',
        breakpoints: true,
      },
      {
        idx: 2,
        when: 1780491004935,
        tag: '0002_app_prefs_last_app_open',
        breakpoints: true,
      },
      {
        idx: 3,
        when: 1780491004936,
        tag: '0003_app_prefs_nudge_hours',
        breakpoints: true,
      },
      {
        idx: 4,
        when: 1781000000000,
        tag: '0004_app_prefs_backup',
        breakpoints: true,
      },
      {
        idx: 5,
        when: 1782000000000,
        tag: '0005_app_prefs_theme_preference',
        breakpoints: true,
      },
      {
        idx: 6,
        when: 1783000000000,
        tag: '0006_extraction_logs',
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
    m0005,
    m0006,
  },
};

export default migrations;
