CREATE TABLE `inviteLinks` (
	`inviteId` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`inviteIdBuffer` blob NOT NULL,
	`url` text NOT NULL,
	`roleId` text NOT NULL,
	`roleName` text,
	`roleDescription` text,
	`seedTime` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer NOT NULL
);
