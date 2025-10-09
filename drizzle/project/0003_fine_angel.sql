ALTER TABLE `observation` ADD `presetDocId` text GENERATED ALWAYS AS ((json_extract(`presetRef`, '$.docId'))) VIRTUAL;--> statement-breakpoint
ALTER TABLE `observation` ADD `presetVersionId` text GENERATED ALWAYS AS ((json_extract(`presetRef`, '$.versionId'))) VIRTUAL;--> statement-breakpoint
ALTER TABLE `preset` ADD `iconDocId` text GENERATED ALWAYS AS ((json_extract(`iconRef`, '$.docId'))) VIRTUAL;--> statement-breakpoint
ALTER TABLE `preset` ADD `iconVersionId` text GENERATED ALWAYS AS ((json_extract(`iconRef`, '$.versionId'))) VIRTUAL;--> statement-breakpoint
ALTER TABLE `track` ADD `presetDocId` text GENERATED ALWAYS AS ((json_extract(`presetRef`, '$.docId'))) VIRTUAL;--> statement-breakpoint
ALTER TABLE `track` ADD `presetVersionId` text GENERATED ALWAYS AS ((json_extract(`presetRef`, '$.versionId'))) VIRTUAL;