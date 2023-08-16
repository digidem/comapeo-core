// These schemas are all in a "client" database. There is only one client
// database and it contains information that is shared across all projects on a
// device
import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@mapeo/schema'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable } from './utils.js'

export const projectTable = sqliteTable('project', toColumns(schemas.project))
export const projectBacklinkTable = backlinkTable(projectTable)
export const projectKeysTable = sqliteTable('projectKeys', {
  projectId: text('projectId').notNull().primaryKey(),
  encryptionKeys: blob('encryptionKeys').notNull(),
})
