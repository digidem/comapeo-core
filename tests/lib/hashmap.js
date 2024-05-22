import test from 'node:test'
import assert from 'node:assert/strict'
import HashMap from '../../src/lib/hashmap.js'

test('empty init', () => {
  const map = new HashMap(join)

  assert.equal(map.size, 0)
})

test('init from iterable', () => {
  const map = new HashMap(
    join,
    new Set([
      [[1, 2], 3],
      [[4, 5], 6],
    ])
  )

  assert.equal(map.size, 2)
  assert.equal(map.get([1, 2]), 3)
  assert.equal(map.get([4, 5]), 6)
  assert.equal(map.get([7, 8]), undefined)
  assert(map.has([1, 2]))
  assert(map.has([4, 5]))
  assert(!map.has([7, 8]))
})

test('creating, reading, updating, and deleting', () => {
  const map = new HashMap(join)

  map.set([1, 2], 3)

  assert.equal(map.size, 1)
  assert.equal(map.get([1, 2]), 3)
  assert.equal(map.get([4, 5]), undefined)
  assert(map.has([1, 2]))
  assert(!map.has([4, 5]))

  map.set([1, 2], 100)

  assert.equal(map.get([1, 2]), 100)

  map.delete([1, 2])

  assert.equal(map.size, 0)
  assert.equal(map.get([1, 2]), undefined)
  assert(!map.has([1, 2]))
})

test('uses same-value-zero equality for keys', () => {
  /** @param {number} n */
  const identity = (n) => n
  const map = new HashMap(identity)

  map.set(0, 'foo')
  assert.equal(map.get(0), 'foo')
  assert.equal(map.get(0), map.get(-0))

  map.set(NaN, 'bar')
  assert.equal(map.get(NaN), 'bar')
})

test('delete() returns whether the key was present', () => {
  const map = new HashMap(join)
  map.set([1, 2], 3)

  assert(map.delete([1, 2]))
  assert(!map.delete([1, 2]))
})

test('set() returns the map', () => {
  const map = new HashMap(join)

  assert.equal(map.set([1, 2], 3), map)
})

test('values()', () => {
  const map = new HashMap(join, [
    [[1, 2], 3],
    [[4, 5], 6],
  ])

  assert.deepEqual(Array.from(map.values()), [3, 6])
})

/**
 * @param {ReadonlyArray<unknown>} arr
 * @returns {string}
 */
function join(arr) {
  return arr.join('-')
}
