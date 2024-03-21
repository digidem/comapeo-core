// @ts-check
import test from 'brittle'
import HashMap from '../../src/lib/hashmap.js'

test('empty init', (t) => {
  const map = new HashMap(join)

  t.is(map.size, 0)
})

test('init from iterable', (t) => {
  const map = new HashMap(
    join,
    new Set([
      [[1, 2], 3],
      [[4, 5], 6],
    ])
  )

  t.is(map.size, 2)
  t.is(map.get([1, 2]), 3)
  t.is(map.get([4, 5]), 6)
  t.is(map.get([7, 8]), undefined)
  t.ok(map.has([1, 2]))
  t.ok(map.has([4, 5]))
  t.absent(map.has([7, 8]))
})

test('creating, reading, updating, and deleting', (t) => {
  const map = new HashMap(join)

  map.set([1, 2], 3)

  t.is(map.size, 1)
  t.is(map.get([1, 2]), 3)
  t.is(map.get([4, 5]), undefined)
  t.ok(map.has([1, 2]))
  t.absent(map.has([4, 5]))

  map.set([1, 2], 100)

  t.is(map.get([1, 2]), 100)

  map.delete([1, 2])

  t.is(map.size, 0)
  t.is(map.get([1, 2]), undefined)
  t.absent(map.has([1, 2]))
})

test('uses same-value-zero equality for keys', (t) => {
  /** @param {number} n */
  const identity = (n) => n
  const map = new HashMap(identity)

  map.set(0, 'foo')
  t.is(map.get(0), 'foo')
  t.is(map.get(0), map.get(-0))

  map.set(NaN, 'bar')
  t.is(map.get(NaN), 'bar')
})

test('delete() returns whether the key was present', (t) => {
  const map = new HashMap(join)
  map.set([1, 2], 3)

  t.ok(map.delete([1, 2]))
  t.absent(map.delete([1, 2]))
})

test('set() returns the map', (t) => {
  const map = new HashMap(join)

  t.is(map.set([1, 2], 3), map)
})

test('values()', (t) => {
  const map = new HashMap(join, [
    [[1, 2], 3],
    [[4, 5], 6],
  ])

  t.alike(Array.from(map.values()), [3, 6])
})

/**
 * @param {ReadonlyArray<unknown>} arr
 * @returns {string}
 */
function join(arr) {
  return arr.join('-')
}
