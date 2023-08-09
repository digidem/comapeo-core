import { text, getTableConfig, sqliteTable } from 'drizzle-orm/sqlite-core'

/**
 * @template {string} [TName=string]
 * @typedef {import('drizzle-orm/sqlite-core').SQLiteTableWithColumns<{
 *   name: TName;
 *   schema: string | undefined;
 *   columns: any
 * }>} SqliteTable
 */

export const BACKLINK_TABLE_POSTFIX = '_backlink'

/**
 * Table for storing backlinks, used for indexing. There needs to be one for
 * each indexed document type
 * @param {SqliteTable} tableSchema
 */
export function backlinkTable(tableSchema) {
  const { name } = getTableConfig(tableSchema)
  return sqliteTable(getBacklinkTableName(name), {
    versionId: text('versionId').notNull().primaryKey(),
  })
}

/**
 * @param {string} tableName
 */
export function getBacklinkTableName(tableName) {
  return tableName + BACKLINK_TABLE_POSTFIX
}
