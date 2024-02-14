CREATE TABLE `translation` (
	`docId` text PRIMARY KEY NOT NULL,
	`versionId` text NOT NULL,
	`schemaName` text NOT NULL,
	`createdAt` text NOT NULL,
	`createdBy` text NOT NULL,
	`updatedAt` text NOT NULL,
	`links` text NOT NULL,
	`deleted` integer NOT NULL,
	`schemaNameRef` text NOT NULL,
	`docIdRef` text NOT NULL,
	`fieldRef` text NOT NULL,
	`languageCode` text NOT NULL,
	`regionCode` text NOT NULL,
	`message` text NOT NULL,
	`forks` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE deviceInfo ADD `deviceType` text;