/*
 Manually generated migration because SQLITE and Drizzle do not support
 altering a column to be nullable.
*/
ALTER TABLE `localDeviceInfo` RENAME TO `deviceSettings`;--> statement-breakpoint
DROP INDEX IF EXISTS `localDeviceInfo_deviceId_unique`;--> statement-breakpoint
ALTER TABLE deviceSettings ADD `isArchiveDevice` integer;--> statement-breakpoint
ALTER TABLE deviceSettings RENAME COLUMN `deviceInfo` TO `deviceInfoOld`;--> statement-breakpoint
ALTER TABLE deviceSettings ADD `deviceInfo` text;--> statement-breakpoint
UPDATE deviceSettings SET `deviceInfo` = `deviceInfoOld`;--> statement-breakpoint
ALTER TABLE deviceSettings DROP COLUMN `deviceInfoOld`;--> statement-breakpoint
CREATE UNIQUE INDEX `deviceSettings_deviceId_unique` ON `deviceSettings` (`deviceId`);
