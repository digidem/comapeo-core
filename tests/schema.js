/* eslint-disable no-unused-vars */
import { test } from 'brittle'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import * as clientTableSchemas from '../lib/schema/client.js'
import * as projectTableSchemas from '../lib/schema/project.js'
import { dereferencedDocSchemas as jsonSchemas } from '@mapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

test('Expected table config', (t) => {
  const allTableSchemas = [
    ...Object.values(clientTableSchemas),
    ...Object.values(projectTableSchemas),
  ]

  for (const tableSchema of allTableSchemas) {
    const config = getTableConfig(tableSchema)
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
 * @typedef {import('../lib/schema/schema-to-drizzle.js').OptionalToNull<T>} OptionalToNull
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

  /** @type {OptionalToNull<MapeoType<'observation'>>} */
  const o = db.select().from(observationTable).get()

  /** @type {OptionalToNull<MapeoType<'preset'>>} */
  const p = db.select().from(presetTable).get()

  /** @type {OptionalToNull<MapeoType<'field'>>} */
  const f = db.select().from(fieldTable).get()

  t.pass()
})
