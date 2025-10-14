import test from 'node:test'
import assert from 'node:assert/strict'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import * as clientTableSchemas from '../src/schema/client.js'
import * as projectTableSchemas from '../src/schema/project.js'
import { dereferencedDocSchemas as jsonSchemas } from '@comapeo/schema'
import {
  BACKLINK_TABLE_POSTFIX,
  getBacklinkTableName,
} from '../src/schema/comapeo-to-drizzle.js'

const MAPEO_DATATYPE_NAMES = Object.keys(jsonSchemas)

test('Expected table config', () => {
  const allTableSchemas = [
    ...Object.values(clientTableSchemas),
    ...Object.values(projectTableSchemas),
  ]
  const datatypesToCheck = new Set(MAPEO_DATATYPE_NAMES)

  for (const tableSchema of allTableSchemas) {
    const config = getTableConfig(tableSchema)

    // Only test Mapeo Schema data types in this test
    if (!MAPEO_DATATYPE_NAMES.includes(config.name)) continue
    datatypesToCheck.delete(config.name)

    assert(
      config.columns.find((col) => col.name === 'forks'),
      'has forks column'
    )

    const schemaName = config.name
    assert(schemaName in jsonSchemas)
    const jsonSchema =
      jsonSchemas[/** @type {keyof typeof jsonSchemas} */ (schemaName)]
    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      const columnConfig = config.columns.find((v) => v.name === key)
      assert(columnConfig)
      if (key === 'docId') {
        assert.equal(columnConfig.primary, true, 'docId is primary key')
      } else {
        assert.equal(columnConfig.primary, false, key + ' is not primary key')
      }
      assert.equal(
        columnConfig.notNull,
        // @ts-ignore
        jsonSchema.required.includes(key),
        'NOT NULL matches `required`'
      )
      // Only fields that are required should have a default set in the SQLite column
      const expectedDefault =
        // @ts-ignore
        jsonSchema.required.includes(key) ? value.default : undefined
      assert.equal(columnConfig.default, expectedDefault, 'Default is correct')
    }
  }
  assert.equal(datatypesToCheck.size, 0, 'All datatypes have tables')
})

test('backlink table exists for every indexed data type', () => {
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
    assert(
      backlinkTableNames.includes(getBacklinkTableName(name)),
      `backlink table for ${name}`
    )
  }
})
