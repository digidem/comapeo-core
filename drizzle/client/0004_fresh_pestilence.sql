CREATE TABLE `backupProjectInfo` (
	`projectId` text PRIMARY KEY NOT NULL,
	`projectName` text NOT NULL,
	`projectDescription` text,
	`sendStats` integer DEFAULT false NOT NULL
);
