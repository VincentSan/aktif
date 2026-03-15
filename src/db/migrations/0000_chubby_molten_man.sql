CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`location` text,
	`owner` text,
	`owner_id` text,
	`classification` text,
	`access_restrictions` text,
	`status` text DEFAULT 'actif' NOT NULL,
	`entry_date` text DEFAULT (DATE('now')) NOT NULL,
	`review_date` text,
	`next_review_date` text,
	`disposal_method` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`components` text DEFAULT '[]' NOT NULL,
	`related_risks` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (DATETIME('now')) NOT NULL,
	`updated_at` text DEFAULT (DATETIME('now')) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` text NOT NULL,
	`action` text NOT NULL,
	`changed_by` text NOT NULL,
	`changed_at` text DEFAULT (DATETIME('now')) NOT NULL,
	`diff` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`department` text,
	`created_at` text DEFAULT (DATETIME('now')) NOT NULL
);

-- Index de performance
CREATE INDEX IF NOT EXISTS `idx_assets_type` ON `assets`(`type`);
CREATE INDEX IF NOT EXISTS `idx_assets_status` ON `assets`(`status`);
CREATE INDEX IF NOT EXISTS `idx_assets_classification` ON `assets`(`classification`);
CREATE INDEX IF NOT EXISTS `idx_assets_next_review_date` ON `assets`(`next_review_date`);
CREATE INDEX IF NOT EXISTS `idx_assets_owner` ON `assets`(`owner`);
CREATE INDEX IF NOT EXISTS `idx_audit_log_asset_id` ON `audit_log`(`asset_id`);
CREATE INDEX IF NOT EXISTS `idx_audit_log_changed_at` ON `audit_log`(`changed_at`);

-- Triggers d'immutabilité audit_log
CREATE TRIGGER IF NOT EXISTS `audit_log_no_update`
  BEFORE UPDATE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

CREATE TRIGGER IF NOT EXISTS `audit_log_no_delete`
  BEFORE DELETE ON `audit_log`
BEGIN
  SELECT RAISE(ABORT, 'audit_log is append-only');
END;

-- Trigger updated_at automatique sur assets
CREATE TRIGGER IF NOT EXISTS `assets_updated_at`
  AFTER UPDATE ON `assets`
  FOR EACH ROW
BEGIN
  UPDATE `assets` SET `updated_at` = DATETIME('now') WHERE `id` = NEW.`id`;
END;
