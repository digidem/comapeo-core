// TODO: move to / use mapeo-schema

export const category = {} // current example data I have for categories.json is empty. what are the expected values here?

export const defaultValue = {} // schema for a single default value in defaults.json

// are icon blobs part of this schema or just a reference to it in a hyperblobs instance?
export const icons = {}

// should translations be stored here?
export const translations = {}

export const metadataPreviousVersion = {
    name: 'metadata',
    blockPrefix: 'metadata',
    schema: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            dataset_id: { type: 'string' }, // will this now be the same as the projectKey?
            projectKey: { type: 'string' },
            author_notes: { type: 'string' },
            version: { type: 'string' } // is this the version of the config? or the version of the app?
        }
    }
}

export const metadata = {
    name: 'metadata',
    blockPrefix: 'metadata',
    schema: {
        type: 'object',
        properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            projectKey: { type: 'string' },
            authorId: { type: 'string' },
            authorNotes: { type: 'string' },
        }
    },
    extraColumns: `
        created INTEGER,
        timestamp INTEGER,
        authorId TEXT,
        type TEXT,
        name TEXT,
        projectKey TEXT,
        authorNotes TEXT
    `,
}

export const field = {
    name: 'field',
    blockPrefix: 'field',
    schema: {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://mapeo.world/schemas/field.json",
        "title": "Field",
        "description": "A field defines a form field that will be shown to the user when creating or editing a map entity. Presets define which fields are shown to the user for a particular map entity. The field definition defines whether the field should show as a text box, multiple choice, single-select, etc. It defines what tag-value is set when the field is entered.",
        "type": "object",
        "properties": {
            version: {
                description: "Version of the field",
                type: "string",
            },
            "id": {
                "description": "Unique value that identifies this element",
                "type": "string"
            },
            "key": {
                "description": "They key in a tags object that this field applies to. For nested properties, key can be an array e.g. for tags = `{ foo: { bar: 1 } }` the key is `['foo', 'bar']`",
                "oneOf": [{
                    "type": "string"
                }, {
                    "type": "array",
                    "items": {
                        "type": "string"
                    }
                }]
            },
            "type": {
                "description": "Type of field - defines how the field is displayed to the user.",
                "type": "string",
                "meta:enum": {
                    "text": "Freeform text field",
                    "localized": "Text field with localization abilities (e.g. name=*, name:es=*, etc.). Currently only supported in Mapeo Desktop territory view.",
                    "number": "Allows only numbers",
                    "select_one": "Select one item from a list of pre-defined options",
                    "select_multiple": "Select any number of items from a list of pre-defined options",
                    "date": "Select a date",
                    "datetime": "Select a date and time"
                },
                "enum": [
                    "text",
                    "localized",
                    "number",
                    "select_one",
                    "select_multiple",
                    "date",
                    "datetime"
                ]
            },
            "label": {
                "description": "Default language label for the form field label",
                "type": "string"
            },
            "readonly": {
                "description": "Field is displayed, but it can't be edited",
                "type": "boolean",
                "default": false
            },
            "appearance": {
                "description": "For text fields, display as a single-line or multi-line field",
                "type": "string",
                "meta:enum": {
                    "singleline": "Text will be cut-off if more than one line",
                    "multiline": "Text will wrap to multiple lines within text field"
                },
                "enum": ["singleline", "multiline"],
                "default": "multiline"
            },
            "snake_case": {
                "description": "Convert field value into snake_case (replace spaces with underscores and convert to lowercase)",
                "type": "boolean",
                "default": false
            },
            "options": {
                "description": "List of options the user can select for single- or multi-select fields",
                "type": "array",
                "items": {
                    "anyOf": [{
                        "type": "string"
                    }, {
                        "type": "boolean"
                    }, {
                        "type": "number"
                    }, {
                        "type": "null"
                    }, {
                        "type": "object",
                        "properties": {
                            "label": {
                                "description": "Label in default language to display to the user for this option",
                                "type": "string"
                            },
                            "value": {
                                "description": "Value for tag when this option is selected",
                                "anyOf": [{
                                    "type": "string"
                                }, {
                                    "type": "boolean"
                                }, {
                                    "type": "number"
                                }, {
                                    "type": "null"
                                }]
                            }
                        },
                        "required": ["value"]
                    }]
                }
            },
            "universal": {
                "description": "If true, this field will appear in the Add Field list for all presets",
                "type": "boolean",
                "default": false
            },
            "placeholder": {
                "description": "Displayed as a placeholder in an empty text or number field before the user begins typing. Use 'helperText' for important information, because the placeholder is not visible after the user has entered data.",
                "type": "string"
            },
            "helperText": {
                "description": "Additional context about the field, e.g. hints about how to answer the question.",
                "type": "string"
            },
            "min_value": {
                "description": "Minimum field value (number, date or datetime fields only). For date or datetime fields, is seconds since unix epoch",
                "type": "integer"
            },
            "max_value": {
                "description": "Maximum field value (number, date or datetime fields only). For date or datetime fields, is seconds since unix epoch",
                "type": "integer"
            }
        },
        "required": ["id", "key", "type"],
        "additionalProperties": false
    },
    extraColumns: `
        id TEXT,
        key TEXT,
        type TEXT,
    `
}

export const preset = {
    name: 'preset',
    blockPrefix: 'preset',
    schema: {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://mapeo.world/schemas/preset.json",
        "title": "Preset",
        "description": "Presets define how map entities are displayed to the user. They define the icon used on the map, and the fields / questions shown to the user when they create or edit the entity on the map. The `tags` property of a preset is used to match the preset with observations, nodes, ways and relations. If multiple presets match, the one that matches the most tags is used.",
        "type": "object",
        "additionalProperties": false,
        "properties": {
            version: {
                description: "Version of this preset",
                type: "string",
            },
            "schemaVersion": {
                "description": "Version of schema. Should increment for breaking changes to the schema",
                "type": "number",
                "minimum": 1,
                "meta:enum": {
                    "1": "Current schema version is `1`"
                },
                "enum": [1]
            },
            "id": {
                "description": "Unique value that identifies this element",
                "type": "string"
            },
            "name": {
                "description": "Name for the feature in default language.",
                "type": "string"
            },
            "geometry": {
                "description": "Valid geometry types for the feature - this preset will only match features of this geometry type `\"point\", \"vertex\", \"line\", \"area\", \"relation\"`",
                "type": "array",
                "minItems": 1,
                "uniqueItems": true,
                "items": {
                    "type": "string",
                    "enum": ["point", "vertex", "line", "area", "relation"]
                }
            },
            "tags": {
                "description": "The tags are used to match the preset to existing map entities. You can match based on multiple tags E.g. if you have existing points with the tags `nature:tree` and `species:oak` then you can add both these tags here in order to match only oak trees.",
                "type": "object",
                "properties": {},
                "additionalProperties": true
            },
            "addTags": {
                "description": "Tags that are added when changing to the preset (default is the same value as 'tags')",
                "type": "object",
                "properties": {},
                "additionalProperties": true
            },
            "removeTags": {
                "description": "Tags that are removed when changing to another preset (default is the same value as 'addTags' which in turn defaults to 'tags')",
                "type": "object",
                "properties": {},
                "additionalProperties": true
            },
            "fields": {
                "description": "IDs of fields to displayed to the user when the preset is created or edited",
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "additionalFields": {
                "description": "Additional fields to display (used internally by Mapeo Desktop, no need to define this in preset)",
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "icon": {
                "description": "ID of preset icon which represents this preset",
                "type": "string"
            },
            "terms": {
                "description": "Synonyms or related terms (used for search)",
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "sort": {
                "description": "When presets are displayed as a list, defines the order it should be sorted. Presets with lowest sort numbers are displayed first",
                "type": "integer"
            }
        },
        "required": [
            "id",
            "name",
            "geometry",
            "tags"
        ]
    },
    extraColumns: `
        id TEXT,
        name TEXT,
    `
}
