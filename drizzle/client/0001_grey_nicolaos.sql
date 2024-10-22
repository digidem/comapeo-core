/*
Manually generated migration because SQLITE and Drizzle do not support
 altering a column to be nullable.
*/
ALTER TABLE localDeviceInfo ADD `isArchiveDevice` integer;
--> statement-breakpoint
ALTER TABLE localDeviceInfo RENAME COLUMN `deviceInfo` TO `deviceInfoOld`;
--> statement-breakpoint
ALTER TABLE localDeviceInfo ADD `deviceInfo` text;
--> statement-breakpoint
UPDATE localDeviceInfo SET `deviceInfo` = `deviceInfoOld`;
--> statement-breakpoint
ALTER TABLE localDeviceInfo DROP COLUMN `deviceInfoOld`;
