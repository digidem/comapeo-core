import test from 'node:test'
import assert from 'node:assert/strict'
import { jsonSchemaToDrizzleSqliteTable as toDrizzle } from '../../src/schema/json-schema-to-drizzle.js'
import { text } from 'drizzle-orm/sqlite-core'
import { getTableColumns } from 'drizzle-orm'

test('throws if not passed an object schema', () => {
  assert.throws(() => {
    toDrizzle('myTable', {
      // @ts-expect-error
      type: 'number',
      properties: {},
    })
  })
})

test('Add additional columns', () => {
  const table = toDrizzle(
    'myTable',
    {
      type: 'object',
      properties: {},
    },
    {
      additionalColumns: {
        forks: text('forks', { mode: 'json' }),
      },
    }
  )
  const columns = getTableColumns(table)
  assert('forks' in columns, 'forks column is added')
  assert(columns.forks.getSQLType() === 'text', 'forks is text column')
})

test('primary key option', () => {
  const table = toDrizzle(
    'myTable',
    {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
    },
    {
      primaryKey: 'id',
    }
  )
  const columns = getTableColumns(table)
  assert.equal(columns.id.primary, true, 'id is primary key')
})

test('skips null', () => {
  const table = toDrizzle('myTable', {
    type: 'object',
    properties: {
      foo: { type: 'null' },
      bar: { type: 'string' },
    },
  })
  const config = getTableColumns(table)
  assert(!('foo' in config), 'null property is skipped')
  assert('bar' in config, 'other properties are added')
})

test('boolean', () => {
  const col = getColumn({ type: 'boolean' })
  assert.equal(
    col.getSQLType(),
    'integer',
    'booleans are stored in INTEGER columns'
  )
})

test('number', () => {
  const col = getColumn({ type: 'number' })
  assert.equal(col.getSQLType(), 'real', 'numbers are stored in REAL columns')
})

test('integer', () => {
  const col = getColumn({ type: 'integer' })
  assert.equal(
    col.getSQLType(),
    'integer',
    'integers are stored in INTEGER columns'
  )
})

test('string', () => {
  const col = getColumn({ type: 'string' })
  assert.equal(col.getSQLType(), 'text', 'strings are stored in TEXT columns')
})

test('string with enum', () => {
  const col = getColumn({ type: 'string', enum: ['foo', 'bar'] })
  assert.equal(col.getSQLType(), 'text', 'strings are stored in TEXT columns')
  assert.deepEqual(col.enumValues, ['foo', 'bar'], 'enums are saved')
})

test('array', () => {
  const col = getColumn({ type: 'array' })
  assert.equal(col.getSQLType(), 'text', 'arrays are stored in TEXT columns')
})

test('object', () => {
  const col = getColumn({ type: 'object' })
  assert.equal(col.getSQLType(), 'text', 'objects are stored in TEXT columns')
})

test('required columns', () => {
  const col = getColumn({ type: 'number' }, { required: ['property'] })
  assert(col.notNull, 'required columns are NOT NULL')
})

test('default values', () => {
  const col = getColumn(
    { type: 'number', default: 123 },
    { required: ['property'] }
  )
  assert.equal(col.default, 123, 'sets default value')
})

/**
 * @param {import('../../src/schema/types.js').JSONSchema7} property
 * @param {Omit<import('../../src/schema/types.js').JSONSchema7Object, 'type' | 'properties'>} [additionalSchema={}]
 */
function getColumn(property, additionalSchema = {}) {
  const table = toDrizzle('myTable', {
    type: 'object',
    properties: { property },
    ...additionalSchema,
  })
  return getTableColumns(table).property
}
