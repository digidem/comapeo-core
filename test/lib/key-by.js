import assert from 'node:assert/strict'
import test from 'node:test'
import { keyBy } from '../../src/lib/key-by.js'

test('returns an empty map if passed an empty iterable', () => {
  assert.deepEqual(
    keyBy([], () => {
      throw new Error('Should not be called')
    }),
    new Map()
  )
})

test('keys a list of items by a key function', () => {
  const items = [
    { id: 1, name: 'foo' },
    { id: 2, name: 'bar' },
    { id: 3, name: 'baz' },
  ]
  const result = keyBy(items, (item) => item.id)
  assert.deepEqual(
    result,
    new Map([
      [1, items[0]],
      [2, items[1]],
      [3, items[2]],
    ])
  )
})

test('duplicate keys', () => {
  const items = [
    { id: 1, name: 'foo' },
    { id: 1, name: 'bar' },
  ]
  assert.throws(() => keyBy(items, (item) => item.id))
})
