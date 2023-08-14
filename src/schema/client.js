// These schemas are all in a "client" database. There is only one client
// database and it contains information that is shared across all projects on a
// device
import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@mapeo/schema'
import { NAMESPACES } from '../core-manager/index.js'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable } from './utils.js'

export const projectTable = sqliteTable('project', toColumns(schemas.project))
export const projectBacklinkTable = backlinkTable(projectTable)
export const projectKeysTable = generateProjectKeysTable()

function generateProjectKeysTable() {
  /** @type {Record<string, import('drizzle-orm/sqlite-core').SQLiteColumnBuilder>}*/
  const columns = {
    projectId: text('projectId').notNull().primaryKey(),
    projectSecretKey: blob('projectSecretKey'),
  }

  for (const namespace of NAMESPACES) {
    const columnName = namespace + 'EncryptionKey'
    columns[columnName] = blob(columnName)
  }

  return sqliteTable('projectKeys', columns)
}
