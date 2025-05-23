// These schemas are all in a "project" database. Each project in Mapeo has an
// independent "project" database.
import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@comapeo/schema'
import { NAMESPACES } from '../constants.js'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable } from './utils.js'

export const translationTable = sqliteTable(
  'translation',
  toColumns(schemas.translation)
)
export const observationTable = sqliteTable(
  'observation',
  toColumns(schemas.observation)
)
export const trackTable = sqliteTable('track', toColumns(schemas.track))
export const remoteDetectionAlertTable = sqliteTable(
  'remoteDetectionAlert',
  toColumns(schemas.remoteDetectionAlert)
)
export const presetTable = sqliteTable('preset', toColumns(schemas.preset))
export const fieldTable = sqliteTable('field', toColumns(schemas.field))
export const coreOwnershipTable = sqliteTable(
  'coreOwnership',
  toColumns(schemas.coreOwnership)
)
export const roleTable = sqliteTable('role', toColumns(schemas.role))
export const deviceInfoTable = sqliteTable(
  'deviceInfo',
  toColumns(schemas.deviceInfo)
)
export const iconTable = sqliteTable('icon', toColumns(schemas.icon))

export const translationBacklinkTable = backlinkTable(translationTable)
export const observationBacklinkTable = backlinkTable(observationTable)
export const trackBacklinkTable = backlinkTable(trackTable)
export const remoteDetectionAlertBacklinkTable = backlinkTable(
  remoteDetectionAlertTable
)
export const presetBacklinkTable = backlinkTable(presetTable)
export const fieldBacklinkTable = backlinkTable(fieldTable)
export const coreOwnershipBacklinkTable = backlinkTable(coreOwnershipTable)
export const roleBacklinkTable = backlinkTable(roleTable)
export const deviceInfoBacklinkTable = backlinkTable(deviceInfoTable)
export const iconBacklinkTable = backlinkTable(iconTable)

export const coresTable = sqliteTable('cores', {
  publicKey: blob('publicKey', { mode: 'buffer' }).notNull(),
  namespace: text('namespace', { enum: NAMESPACES }).notNull(),
})
