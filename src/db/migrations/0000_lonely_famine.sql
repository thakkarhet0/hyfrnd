CREATE TABLE `consent_state` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`stt_consent_granted` integer DEFAULT 0 NOT NULL,
	`consent_version` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`photo_uri` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `context_points` (
	`id` text PRIMARY KEY NOT NULL,
	`memo_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`memo_id`) REFERENCES `memos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`memo_id` text,
	`due_date` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending', 'completed', 'snoozed')),
	`context_snapshot` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`memo_id`) REFERENCES `memos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memos` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`audio_path` text NOT NULL,
	`raw_transcript` text,
	`status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending', 'extracted', 'failed')),
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stt_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`memo_id` text NOT NULL,
	`audio_path` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL CHECK (`status` IN ('pending', 'processing', 'completed', 'failed')),
	`created_at` integer NOT NULL,
	FOREIGN KEY (`memo_id`) REFERENCES `memos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT OR IGNORE INTO `consent_state` (`id`, `stt_consent_granted`, `consent_version`, `updated_at`) VALUES (1, 0, 0, 0);
