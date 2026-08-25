CREATE TABLE `agent_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_name` text NOT NULL,
	`objective` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`result` text,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`finished_at` text
);
--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`health` integer DEFAULT 100 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `datasets_name_unique` ON `datasets` (`name`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity_id` integer,
	`event_type` text NOT NULL,
	`object_id` text,
	`payload` text,
	`occurred_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `identities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`display_name` text NOT NULL,
	`email_hash` text,
	`trust_score` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `identities_external_id_unique` ON `identities` (`external_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_id` integer NOT NULL,
	`body` text NOT NULL,
	`visibility` text DEFAULT 'network' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE no action
);
