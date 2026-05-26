CREATE TABLE `inviteLinks` (
	`inviteId` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`inviteIdBuffer` blob NOT NULL,
	`url` text NOT NULL,
	`roleId` text NOT NULL,
	`roleName` text,
	`roleDescription` text,
	`createdAt` integer NOT NULL
);
