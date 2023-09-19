// These schemas are all in a "project" database. Each project in Mapeo has an
// independent "project" database.
import { sqliteTable } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@mapeo/schema'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable } from './utils.js'

export const observationTable = sqliteTable(
  'observation',
  toColumns(schemas.observation)
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

export const observationBacklinkTable = backlinkTable(observationTable)
export const presetBacklinkTable = backlinkTable(presetTable)
export const fieldBacklinkTable = backlinkTable(fieldTable)
export const coreOwnershipBacklinkTable = backlinkTable(coreOwnershipTable)
export const roleBacklinkTable = backlinkTable(roleTable)
export const deviceInfoBacklinkTable = backlinkTable(deviceInfoTable)
