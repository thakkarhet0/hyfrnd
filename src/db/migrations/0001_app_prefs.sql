CREATE TABLE `app_prefs` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`language` text DEFAULT 'hi' NOT NULL,
	`onboarding_step` text,
	`onboarding_complete` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `app_prefs` (`id`, `language`, `onboarding_step`, `onboarding_complete`, `updated_at`) VALUES (1, 'hi', null, 0, 0);
