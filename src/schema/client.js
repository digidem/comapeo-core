// These schemas are all in a "client" database. There is only one client
// database and it contains information that is shared across all projects on a
// device
import { blob, sqliteTable, text, int } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@comapeo/schema'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable, customJson } from './utils.js'

/**
 * @import { ProjectSettings } from '@comapeo/schema'
 *
 * @internal
 * @typedef {Pick<ProjectSettings, 'name' | 'projectColor' | 'projectDescription'>} ProjectInfo
 */

const projectInfoColumn =
  /** @type {ReturnType<typeof import('drizzle-orm/sqlite-core').customType<{data: ProjectInfo}>>} */ (
    customJson
  )

/** @type {ProjectInfo} */
const PROJECT_INFO_DEFAULT_VALUE = {}

export const projectSettingsTable = sqliteTable(
  'projectSettings',
  toColumns(schemas.projectSettings)
)
export const projectBacklinkTable = backlinkTable(projectSettingsTable)
export const projectKeysTable = sqliteTable('projectKeys', {
  projectId: text('projectId').notNull().primaryKey(),
  projectPublicId: text('projectPublicId').notNull(),
  projectInviteId: blob('projectInviteId').notNull(),
  keysCipher: blob('keysCipher', { mode: 'buffer' }).notNull(),
  projectInfo: projectInfoColumn('projectInfo')
    .default(
      // TODO: There's a bug in Drizzle where the default value does not get transformed by the custom type
      // @ts-expect-error
      JSON.stringify(PROJECT_INFO_DEFAULT_VALUE)
    )
    .notNull(),
})

/**
 * @typedef {Omit<import('@comapeo/schema').DeviceInfoValue, 'schemaName'>} DeviceInfoParam
 */

const deviceInfoColumn =
  /** @type {ReturnType<typeof import('drizzle-orm/sqlite-core').customType<{data: DeviceInfoParam }>>} */ (
    customJson
  )

// This table only ever has one row in it.
export const deviceSettingsTable = sqliteTable('deviceSettings', {
  deviceId: text('deviceId').notNull().unique(),
  deviceInfo: deviceInfoColumn('deviceInfo'),
  isArchiveDevice: int('isArchiveDevice', { mode: 'boolean' }),
})
