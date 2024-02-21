// @ts-check
import test from 'brittle'
import { isRecord } from '../../src/lib/object.js'

test('isRecord()', (t) => {
  class Klass {}

  const records = [
    {},
    { foo: 'bar' },
    Object.create(null),
    new Klass(),
    new Error(),
  ]
  for (const value of records) t.ok(isRecord(value), 'value is record')

  const others = [
    undefined,
    null,
    0,
    123,
    'string',
    Symbol('symbol'),
    () => {},
    [],
  ]
  for (const value of others) t.ok(!isRecord(value), 'value is not a record')
})
