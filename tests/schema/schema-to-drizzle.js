import test from 'node:test'
import assert from 'node:assert/strict'
import { jsonSchemaToDrizzleColumns } from '../../src/schema/schema-to-drizzle.js'
import { sqliteTable } from 'drizzle-orm/sqlite-core'

test('throws if not passed an object schema', () => {
  assert.throws(() => {
    jsonSchemaToDrizzleColumns({ type: 'number', properties: {} })
  })
})

test('always adds "forks" column', () => {
  assert(
    'forks' in jsonSchemaToDrizzleColumns({ type: 'object', properties: {} }),
    'forks column is added'
  )
})

test('skips null', () => {
  assert(
    !(
      'foo' in
      jsonSchemaToDrizzleColumns({
        type: 'object',
        properties: { foo: { type: 'null' } },
      })
    )
  )
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
 * @param {Omit<import('../../src/schema/types.js').JSONSchema7WithProps, 'type' | 'properties'>} [additionalSchema={}]
 */
function getColumn(property, additionalSchema = {}) {
  const cols = jsonSchemaToDrizzleColumns({
    type: 'object',
    properties: { property },
    ...additionalSchema,
  })
  return sqliteTable('test', cols).property
}
