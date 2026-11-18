CREATE TABLE `item_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`save_id` text NOT NULL,
	`field` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_changes_item` ON `item_changes` (`item_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`brand` text,
	`size` text,
	`condition` text,
	`price_pence` integer,
	`labels` text NOT NULL,
	`channels` text NOT NULL,
	`status` text NOT NULL,
	`sold_at` integer,
	`archived_at` integer,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `items_status` ON `items` (`status`);