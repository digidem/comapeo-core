CREATE TABLE `project_backlink` (
	`versionId` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projectKeys` (
	`projectId` text PRIMARY KEY NOT NULL,
	`projectSecretKey` blob,
	`authEncryptionKey` blob,
	`dataEncryptionKey` blob,
	`blobIndexEncryptionKey` blob,
	`blobEncryptionKey` blob
);
--> statement-breakpoint
CREATE TABLE `project` (
	`docId` text PRIMARY KEY NOT NULL,
	`versionId` text NOT NULL,
	`schemaName` text NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	`links` text NOT NULL,
	`name` text NOT NULL,
	`defaultPresets` text NOT NULL,
	`forks` text NOT NULL
);
