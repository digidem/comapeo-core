// These schemas are all in a "client" database. There is only one client
// database and it contains information that is shared across all projects on a
// device
import { blob, sqliteTable, text, int } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@comapeo/schema'
import {
  comapeoSchemaToDrizzleTable as toDrizzle,
  backlinkTable,
} from './comapeo-to-drizzle.js'

/**
 * @import { ProjectSettings } from '@comapeo/schema'
 * @import { $Type } from 'drizzle-orm'
 * @import { SQLiteTextJsonBuilder } from 'drizzle-orm/sqlite-core'
 *
 * @internal
 * @typedef {Pick<ProjectSettings, 'name' | 'projectColor' | 'projectDescription' | 'sendStats'>} ProjectInfo
 */

/** @type {ProjectInfo} */
const PROJECT_INFO_DEFAULT_VALUE = { sendStats: false }

export const projectSettingsTable = toDrizzle(schemas.projectSettings)
export const projectBacklinkTable = backlinkTable('projectSettings')
export const projectKeysTable = sqliteTable('projectKeys', {
  projectId: text('projectId').notNull().primaryKey(),
  projectPublicId: text('projectPublicId').notNull(),
  projectInviteId: blob('projectInviteId', { mode: 'buffer' }).notNull(),
  keysCipher: blob('keysCipher', { mode: 'buffer' }).notNull(),
  projectInfo:
    /** @type {$Type<SQLiteTextJsonBuilder, ProjectInfo>} */
    (text('projectInfo', { mode: 'json' }))
      .default(PROJECT_INFO_DEFAULT_VALUE)
      .notNull(),
  hasLeftProject: int('hasLeftProject', { mode: 'boolean' })
    .notNull()
    .default(false),
})

/**
 * @typedef {Omit<import('@comapeo/schema').DeviceInfoValue, 'schemaName'>} DeviceInfoParam
 */

// This table only ever has one row in it.
export const deviceSettingsTable = sqliteTable('deviceSettings', {
  deviceId: text('deviceId').notNull().unique(),
  deviceInfo:
    /** @type {$Type<SQLiteTextJsonBuilder, DeviceInfoParam>} */
    (text('deviceInfo', { mode: 'json' })),
  isArchiveDevice: int('isArchiveDevice', { mode: 'boolean' }),
})
