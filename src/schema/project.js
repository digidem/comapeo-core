// These schemas are all in a "project" database. Each project in Mapeo has an
// independent "project" database.
import { blob, sqliteTable, sqliteView, text } from 'drizzle-orm/sqlite-core'
import { dereferencedDocSchemas as schemas } from '@comapeo/schema'
import { NAMESPACES } from '../constants.js'
import { jsonSchemaToDrizzleColumns as toColumns } from './schema-to-drizzle.js'
import { backlinkTable } from './utils.js'
import { extractRelations } from './relations.js'
import { getTableColumns, sql } from 'drizzle-orm'

/** @type {Array<keyof typeof schemas>} */
const PROJECT_SCHEMAS = [
  'observation',
  'preset',
  'field',
  'translation',
  'icon',
  'remoteDetectionAlert',
  'track',
  'deviceInfo',
  'role',
  'coreOwnership',
]

/** @type {Record<string, unknown>} */
const drizzleSchema = {}
/** @type {Record<string, unknown>} */
const tablesForRelations = {}
for (const schemaName of PROJECT_SCHEMAS) {
  const table = sqliteTable(schemaName, toColumns(schemas[schemaName]))
  drizzleSchema[`${schemaName}Table`] = table
  if (schemaName !== 'translation') {
    tablesForRelations[schemaName] = table
  }
  drizzleSchema[`${schemaName}BacklinkTable`] = backlinkTable(table)
}

for (const [fromName, fromTable] of Object.entries(tablesForRelations)) {
  const columns = getTableColumns(fromTable)
  for (const col of Object.values(columns)) {
    if (!col.name.endsWith('Refs')) continue
    const toName = col.name.slice(0, -4)
    const toTable = tablesForRelations[toName]
    if (!toTable) {
      throw new Error(
        `Table ${toName}, referenced by ${fromName}.${col.name} not found`
      )
    }
    const junctionTableName = `${fromName}To${capitalizeFirst(toName)}`
    drizzleSchema[junctionTableName] = sqliteView(junctionTableName, {
      [`${fromName}DocId`]: text(`${fromName}DocId`).notNull(),
      [`${toName}DocId`]: text(`${toName}DocId`).notNull(),
    }).as(sql`
SELECT
    ${fromName}.docId AS ${fromName}DocId,
    json_extract(ref.value, '$.docId') AS ${toName}DocId
FROM
    ${fromTable},
    json_each(${fromTable[col.name]}) ref`)
    tablesForRelations[junctionTableName] = drizzleSchema[junctionTableName]
  }
}

drizzleSchema['coresTable'] = sqliteTable('cores', {
  publicKey: blob('publicKey', { mode: 'buffer' }).notNull(),
  namespace: text('namespace', { enum: NAMESPACES }).notNull(),
})

drizzleSchema['relations'] = extractRelations(tablesForRelations)

export default drizzleSchema

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
