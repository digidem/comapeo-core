// These schemas are all in a "client" database. There is only one client
// database and it contains information that is shared across all projects on a
// device
import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@mapeo/schema'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable } from './utils.js'

export const projectTable = sqliteTable('project', toColumns(schemas.project))

export const projectKeysTable = sqliteTable('project_keys', {
  projectKey: text('projectKey').notNull().primaryKey(),
  projectSecretKey: blob('projectSecretKey'),
  authEncryptionKey: blob('authEncryptionKey'),
  dataEncryptionKey: blob('dataEncryptionKey'),
  blobIndexEncryptionKey: blob('blobIndexEncryptionKey'),
  blobEncryptionKey: blob('blobEncryptionKey'),
})

export const projectBacklinkTable = backlinkTable(projectTable)
