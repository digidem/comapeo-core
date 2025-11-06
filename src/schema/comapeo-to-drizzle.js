import { text, sqliteTable } from 'drizzle-orm/sqlite-core'
import { jsonSchemaToDrizzleSqliteTable } from './json-schema-to-drizzle.js'

export const BACKLINK_TABLE_POSTFIX = '_backlink'

/**
 * @import { JsonSchemaToDrizzleSqliteTable } from './types.js'
 * @import { SQLiteTextJsonBuilder } from 'drizzle-orm/sqlite-core'
 * @import { $Type } from 'drizzle-orm'
 * @import { MapeoDocMap } from '../types.js'
 */

/**
 * @typedef {typeof import('@comapeo/schema').dereferencedDocSchemas} ComapeoSchemaMap
 * @typedef {{ forks: $Type<SQLiteTextJsonBuilder, string[]> }} AdditionalColumns
 */

/**
 * @template {ComapeoSchemaMap[keyof ComapeoSchemaMap]} TSchema
 * @param {TSchema} schema
 * @returns {JsonSchemaToDrizzleSqliteTable<
 *   MapeoDocMap[TSchema['properties']['schemaName']['const']],
 *   TSchema,
 *   TSchema['properties']['schemaName']['const'],
 *   AdditionalColumns,
 *   'docId'
 * >}
 */
export function comapeoSchemaToDrizzleTable(schema) {
  return jsonSchemaToDrizzleSqliteTable(
    schema.properties.schemaName.const,
    schema,
    {
      additionalColumns: { forks: text('forks', { mode: 'json' }).notNull() },
      primaryKey: 'docId',
    }
  )
}

/**
 * Table for storing backlinks, used for indexing. There needs to be one for
 * each indexed document type, with a specific name `<datatype>_backlink`
 *
 * @param {import('@comapeo/schema').MapeoDoc['schemaName']} schemaName
 */
export function backlinkTable(schemaName) {
  return sqliteTable(getBacklinkTableName(schemaName), {
    versionId: text('versionId').notNull().primaryKey(),
  })
}

/**
 * @param {string} tableName
 */
export function getBacklinkTableName(tableName) {
  return tableName + BACKLINK_TABLE_POSTFIX
}
