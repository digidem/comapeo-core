// These schemas are all in a "client" database. There is only one client
// database and it contains information that is shared across all projects on a
// device
import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas, valueSchemas } from '@mapeo/schema'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable, customJson } from './utils.js'

const projectInfoColumn =
  /** @type {ReturnType<typeof import('drizzle-orm/sqlite-core').customType<{data: import('../generated/rpc.js').Invite_ProjectInfo }>>} */ (
    customJson
  )

/** @type {import('../generated/rpc.js').Invite_ProjectInfo} */
const PROJECT_INFO_DEFAULT_VALUE = {}

export const projectTable = sqliteTable('project', toColumns(schemas.project))
export const projectBacklinkTable = backlinkTable(projectTable)
export const projectKeysTable = sqliteTable('projectKeys', {
  projectId: text('projectId').notNull().primaryKey(),
  keysCipher: blob('keysCipher', { mode: 'buffer' }).notNull(),
  projectInfo: projectInfoColumn('projectInfo')
    .default(
      // TODO: There's a bug in Drizzle where the default value does not get transformed by the custom type
      // @ts-expect-error
      JSON.stringify(PROJECT_INFO_DEFAULT_VALUE)
    )
    .notNull(),
})

const deviceInfoKeys = /**
 * @type {import('./types.js').NonEmptyArray<
 *   Exclude<keyof typeof valueSchemas['deviceInfo']['properties'], 'schemaName'>
 * >}
 */ (Object.keys(valueSchemas.deviceInfo.properties))

// This table is for arbitrary deviceInfo data - rather than updating the schema
// if we add more properties, we just use a row for each property (like mbtiles
// does for metadata). All values should be stored as JSON
export const deviceInfoTable = sqliteTable('deviceInfo', {
  key: text('key', { enum: deviceInfoKeys }).notNull().unique(),
  value: customJson('value'),
})
