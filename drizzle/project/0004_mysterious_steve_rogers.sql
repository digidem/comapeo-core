CREATE VIEW `presetToField` AS 
SELECT
    'preset'.docId AS 'preset'DocId,
    json_extract(ref.value, '$.docId') AS 'field'DocId
FROM
    "preset",
    json_each("preset"."fieldRefs") ref;--> statement-breakpoint
CREATE VIEW `trackToObservation` AS 
SELECT
    'track'.docId AS 'track'DocId,
    json_extract(ref.value, '$.docId') AS 'observation'DocId
FROM
    "track",
    json_each("track"."observationRefs") ref;