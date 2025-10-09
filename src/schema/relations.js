import {
  defineRelations,
  extractTablesFromSchema,
  getTableName,
  is,
  View,
} from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/sqlite-core'

/**
 * @template {Record<string, unknown>} TSchema
 * @template {import("drizzle-orm").Schema} [TTables=import("drizzle-orm").ExtractTablesFromSchema<TSchema>]
 * @param {TSchema} schema
 * @returns {import("drizzle-orm").ExtractTablesWithRelations<{}, TTables>}
 */
export function extractRelations(schema) {
  const tablesByName = {}
  const tables = extractTablesFromSchema(schema)
  for (const table of Object.values(tables)) {
    const name = getTableName(table)
    tablesByName[name] = table
  }
  return defineRelations(tablesByName, (r) => {
    const relationsByTable = {}
    for (const [name, table] of Object.entries(tablesByName)) {
      if (is(table, View)) continue
      const { columns } = getTableConfig(table)
      for (const col of columns) {
        if (col.name.endsWith('DocId')) {
          const refTableName = col.name.slice(0, -5)
          if (!tablesByName[refTableName]) {
            throw new Error(
              `Table ${refTableName}, referenced by ${name}.${col.name} not found`
            )
          }
          const relations =
            relationsByTable[name] || (relationsByTable[name] = {})
          relations[refTableName] = r.one[refTableName]({
            from: r[name][col.name],
            to: r[refTableName].docId,
          })
        }
        if (col.name.endsWith('Refs')) {
          const fromName = name
          const toName = col.name.slice(0, -4)
          const toTable = tablesByName[toName]
          if (!toTable) {
            throw new Error(
              `Table ${toName}, referenced by ${name}.${col.name} not found`
            )
          }
          const junctionTableName = `${name}To${capitalizeFirst(toName)}`
          const junctionTable = tablesByName[junctionTableName]
          if (!junctionTable || !is(junctionTable, View)) {
            throw new Error(
              `Junction view ${junctionTableName}, required for many-to-many relation between ${name} and ${toName}, not found`
            )
          }
          const relations =
            relationsByTable[fromName] || (relationsByTable[fromName] = {})
          relations[toName + 's'] = r.many[toName]({
            from: r[fromName].docId.through(
              r[junctionTableName][`${fromName}DocId`]
            ),
            to: r[toName].docId.through(r[junctionTableName][`${toName}DocId`]),
          })
        }
      }
    }
    return relationsByTable
  })
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
