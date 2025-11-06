// These schemas are all in a "project" database. Each project in Mapeo has an
// independent "project" database.
import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@comapeo/schema'
import { NAMESPACES } from '../constants.js'
import {
  comapeoSchemaToDrizzleTable as toDrizzle,
  backlinkTable,
} from './comapeo-to-drizzle.js'

export const translationTable = toDrizzle(schemas.translation)
export const observationTable = toDrizzle(schemas.observation)
export const trackTable = toDrizzle(schemas.track)
export const remoteDetectionAlertTable = toDrizzle(schemas.remoteDetectionAlert)
export const presetTable = toDrizzle(schemas.preset)
export const fieldTable = toDrizzle(schemas.field)
export const coreOwnershipTable = toDrizzle(schemas.coreOwnership)
export const roleTable = toDrizzle(schemas.role)
export const deviceInfoTable = toDrizzle(schemas.deviceInfo)
export const iconTable = toDrizzle(schemas.icon)

export const translationBacklinkTable = backlinkTable('translation')
export const observationBacklinkTable = backlinkTable('observation')
export const trackBacklinkTable = backlinkTable('track')
export const remoteDetectionAlertBacklinkTable = backlinkTable(
  'remoteDetectionAlert'
)
export const presetBacklinkTable = backlinkTable('preset')
export const fieldBacklinkTable = backlinkTable('field')
export const coreOwnershipBacklinkTable = backlinkTable('coreOwnership')
export const roleBacklinkTable = backlinkTable('role')
export const deviceInfoBacklinkTable = backlinkTable('deviceInfo')
export const iconBacklinkTable = backlinkTable('icon')

export const coresTable_Deprecated = sqliteTable('cores', {
  publicKey: blob('publicKey', { mode: 'buffer' }).notNull(),
  namespace: text('namespace', { enum: NAMESPACES }).notNull(),
})
