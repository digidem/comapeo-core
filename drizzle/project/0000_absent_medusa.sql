CREATE TABLE `coreOwnership_backlink` (
	`versionId` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coreOwnership` (
	`docId` text PRIMARY KEY NOT NULL,
	`versionId` text NOT NULL,
	`schemaName` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`links` text NOT NULL,
	`authCoreId` text NOT NULL,
	`configCoreId` text NOT NULL,
	`dataCoreId` text NOT NULL,
	`blobCoreId` text NOT NULL,
	`blobIndexCoreId` text NOT NULL,
	`forks` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `field_backlink` (
	`versionId` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `field` (
	`docId` text PRIMARY KEY NOT NULL,
	`versionId` text NOT NULL,
	`schemaName` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`links` text NOT NULL,
	`tagKey` text NOT NULL,
	`type` text NOT NULL,
	`label` text NOT NULL,
	`appearance` text,
	`snakeCase` integer,
	`options` text,
	`universal` integer,
	`placeholder` text,
	`helperText` text,
	`forks` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `observation_backlink` (
	`versionId` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `observation` (
	`docId` text PRIMARY KEY NOT NULL,
	`versionId` text NOT NULL,
	`schemaName` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`links` text NOT NULL,
	`lat` real,
	`lon` real,
	`refs` text NOT NULL,
	`attachments` text NOT NULL,
	`tags` text NOT NULL,
	`metadata` text NOT NULL,
	`forks` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `preset_backlink` (
	`versionId` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `preset` (
	`docId` text PRIMARY KEY NOT NULL,
	`versionId` text NOT NULL,
	`schemaName` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`links` text NOT NULL,
	`name` text NOT NULL,
	`geometry` text NOT NULL,
	`tags` text NOT NULL,
	`addTags` text NOT NULL,
	`removeTags` text NOT NULL,
	`fieldIds` text NOT NULL,
	`iconId` text,
	`terms` text NOT NULL,
	`forks` text NOT NULL
);
