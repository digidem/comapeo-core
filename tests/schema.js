/* eslint-disable no-unused-vars */
import { test } from 'brittle'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import * as clientTableSchemas from '../src/schema/client.js'
import * as projectTableSchemas from '../src/schema/project.js'
import { dereferencedDocSchemas as jsonSchemas } from '@mapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import {
  BACKLINK_TABLE_POSTFIX,
  getBacklinkTableName,
} from '../src/schema/utils.js'
import { deNullify } from '../src/datatype/index.js'

const MAPEO_DATATYPE_NAMES = Object.keys(jsonSchemas)

test('Expected table config', (t) => {
  const allTableSchemas = [
    ...Object.values(clientTableSchemas),
    ...Object.values(projectTableSchemas),
  ]

  for (const tableSchema of allTableSchemas) {
    const config = getTableConfig(tableSchema)

    // Only test Mapeo Schema data types in this test
    if (!MAPEO_DATATYPE_NAMES.includes(config.name)) continue

    const schemaName = config.name
    if (!(schemaName in jsonSchemas)) {
      t.fail()
      continue
    }
    const jsonSchema =
      jsonSchemas[/** @type {keyof typeof jsonSchemas} */ (schemaName)]
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      const columnConfig = config.columns.find((v) => v.name === key)
      if (!columnConfig) {
        t.fail()
        continue
      }
      if (key === 'docId') {
        t.is(columnConfig.primary, true, 'docId is primary key')
      } else {
        t.is(columnConfig.primary, false, key + ' is not primary key')
      }
      t.is(
        columnConfig.notNull,
        // @ts-ignore
        jsonSchema.required.includes(key),
        'NOT NULL matches `required`'
      )
      t.is(columnConfig.default, value.default, 'Default is correct')
    }
  }
})

/**
 * @template {object} T
 * @typedef {import('../src/schema/types.js').OptionalToNull<T>} OptionalToNull
 */
/**
 * @typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */
/**
 * @template {MapeoDoc['schemaName']} T
 * @typedef {Extract<MapeoDoc, { schemaName: T }>} MapeoType
 */

test('Types match', { skip: true }, (t) => {
  // No brittle tests here, it's the typescript that must pass
  // This fails at runtime anyway because we don't create tables in the db

  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  const { observationTable, presetTable, fieldTable } = projectTableSchemas

  /** @type {MapeoType<'observation'>} */
  const o = deNullify(db.select().from(observationTable).get())

  /** @type {MapeoType<'preset'>} */
  const p = deNullify(db.select().from(presetTable).get())

  /** @type {MapeoType<'field'>} */
  const f = deNullify(db.select().from(fieldTable).get())

  t.pass()
})

test('backlink table exists for every indexed data type', (t) => {
  // Every indexed datatype needs a backlink table, which is used by
  // sqlite-indexer to track backlinks
  const allTableNames = [
    ...Object.values(clientTableSchemas),
    ...Object.values(projectTableSchemas),
  ].map((tableSchema) => {
    return getTableConfig(tableSchema).name
  })

  const backlinkTableNames = allTableNames.filter((name) =>
    name.endsWith(BACKLINK_TABLE_POSTFIX)
  )
  const dataTypeTableNames = allTableNames.filter((name) =>
    MAPEO_DATATYPE_NAMES.includes(name)
  )

  for (const name of dataTypeTableNames) {
    t.ok(
      backlinkTableNames.includes(getBacklinkTableName(name)),
      `backlink table for ${name}`
    )
  }
})
