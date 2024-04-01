// @ts-check
import test from 'brittle'
import { jsonSchemaToDrizzleColumns } from '../../src/schema/schema-to-drizzle.js'
import { sqliteTable } from 'drizzle-orm/sqlite-core'

test('throws if not passed an object schema', (t) => {
  t.exception(() => {
    jsonSchemaToDrizzleColumns({ type: 'number', properties: {} })
  })
})

test('always adds "forks" column', (t) => {
  t.ok(
    'forks' in jsonSchemaToDrizzleColumns({ type: 'object', properties: {} }),
    'forks column is added'
  )
})

test('skips null', (t) => {
  t.absent(
    'foo' in
      jsonSchemaToDrizzleColumns({
        type: 'object',
        properties: { foo: { type: 'null' } },
      })
  )
})

test('boolean', (t) => {
  const col = getColumn({ type: 'boolean' })
  t.is(col.getSQLType(), 'integer', 'booleans are stored in INTEGER columns')
})

test('number', (t) => {
  const col = getColumn({ type: 'number' })
  t.is(col.getSQLType(), 'real', 'numbers are stored in REAL columns')
})

test('integer', (t) => {
  const col = getColumn({ type: 'integer' })
  t.is(col.getSQLType(), 'integer', 'integers are stored in INTEGER columns')
})

test('string', (t) => {
  const col = getColumn({ type: 'string' })
  t.is(col.getSQLType(), 'text', 'strings are stored in TEXT columns')
})

test('string with enum', (t) => {
  const col = getColumn({ type: 'string', enum: ['foo', 'bar'] })
  t.is(col.getSQLType(), 'text', 'strings are stored in TEXT columns')
  t.alike(col.enumValues, ['foo', 'bar'], 'enums are saved')
})

test('array', (t) => {
  const col = getColumn({ type: 'array' })
  t.is(col.getSQLType(), 'text', 'arrays are stored in TEXT columns')
})

test('object', (t) => {
  const col = getColumn({ type: 'object' })
  t.is(col.getSQLType(), 'text', 'objects are stored in TEXT columns')
})

test('required columns', (t) => {
  const col = getColumn({ type: 'number' }, { required: ['property'] })
  t.ok(col.notNull, 'required columns are NOT NULL')
})

test('default values', (t) => {
  const col = getColumn(
    { type: 'number', default: 123 },
    { required: ['property'] }
  )
  t.is(col.default, 123, 'sets default value')
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
