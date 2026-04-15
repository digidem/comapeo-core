CREATE TABLE `pendingInvites` (
	`inviteId` text PRIMARY KEY NOT NULL,
	`inviteIdBuffer` blob NOT NULL,
	`url` text NOT NULL,
	`roleId` text NOT NULL,
	`roleName` text,
	`roleDescription` text,
	`inviteeDeviceId` text,
	`createdAt` integer NOT NULL
);
