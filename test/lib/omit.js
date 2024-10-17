import test from 'node:test'
import assert from 'node:assert/strict'
import { omit } from '../../src/lib/omit.js'

test('an empty list of keys to omit', () => {
  assert.deepEqual(omit({}, []), {})
  assert.deepEqual(omit({ foo: 1 }, []), { foo: 1 })
})

test('omitting non-existent properties', () => {
  assert.deepEqual(omit(record(), ['foo', 'bar']), {})
  assert.deepEqual(omit(record({ foo: 1 }), ['bar', 'baz']), { foo: 1 })
})

test('omitting properties', () => {
  const obj = { foo: 1, bar: 2, baz: 3 }
  assert.deepEqual(omit(obj, ['baz']), { foo: 1, bar: 2 })
  assert.deepEqual(omit(obj, ['bar', 'baz']), { foo: 1 })
})

test('only includes "own" properties in the result', () => {
  class Klass {
    foo = 1
    bar = 2
    baz() {
      return 3
    }
  }

  const omitted = omit(new Klass(), ['bar'])
  assert.deepEqual(omitted, { foo: 1 }, 'plain object is returned')
  assert(!(omitted instanceof Klass), 'inheritance is lost after omitting')
  assert(!('baz' in omitted), 'inherited properties are lost after omitting')

  const obj = new Klass()
  obj.baz = () => 4
  assert.equal(omit(obj, [])?.baz(), 4, 'own properties can be kept')
  assert(!('baz' in omit(obj, ['baz'])), 'own properties can be removed')
})

test('only includes enumerable properties', () => {
  const obj = { foo: 1 }
  Object.defineProperty(obj, 'bar', { enumerable: true, value: 2 })
  Object.defineProperty(obj, 'baz', { enumerable: false, value: 3 })

  assert.deepEqual(omit(obj, ['foo']), { bar: 2 })
})

test("doesn't modify the input", () => {
  const obj = { foo: 1, bar: 2, baz: 3 }
  omit(obj, [])
  omit(obj, ['foo', 'bar'])
  assert.deepEqual(
    obj,
    { foo: 1, bar: 2, baz: 3 },
    'input should not be modified'
  )
})

/**
 * Convenience helper to satisfy TypeScript.
 * @param {Record<string, unknown>} [result]
 * @returns {Record<string, unknown>}
 */
const record = (result = {}) => result
