import { combineStates } from '../../src/blob-store/live-download.js'
import test from 'node:test'
import assert from 'node:assert/strict'

const partial = {
  haveCount: 0,
  haveBytes: 0,
  wantCount: 0,
  wantBytes: 0,
  error: null,
}

const fixtures = /** @type {const} */ ([
  {
    statuses: ['checking', 'downloading', 'downloaded'],
    expected: 'checking',
  },
  {
    statuses: ['checking', 'downloading', 'downloading'],
    expected: 'checking',
  },
  {
    statuses: ['downloading', 'downloading', 'downloaded'],
    expected: 'downloading',
  },
  {
    statuses: ['downloaded', 'downloaded', 'downloaded'],
    expected: 'downloaded',
  },
  {
    statuses: ['checking', 'checking', 'checking'],
    expected: 'checking',
  },
])

test('expected combined state, no error or abort', () => {
  for (const { statuses, expected } of fixtures) {
    const inputs = statuses.map((status) => ({ state: { ...partial, status } }))
    const expectedState = { ...partial, status: expected }
    for (const permuted of permute(inputs)) {
      assert.deepEqual(combineStates(permuted), expectedState)
    }
  }
})

test('expected combined state, with error', () => {
  for (const { statuses } of fixtures) {
    const inputs = [
      ...statuses.map((status) => ({ state: { ...partial, status } })),
      {
        state: {
          ...partial,
          error: new Error(),
          status: /** @type {const} */ ('error'),
        },
      },
    ]
    const expectedState = { ...partial, error: new Error(), status: 'error' }
    for (const permuted of permute(inputs)) {
      assert.deepEqual(combineStates(permuted), expectedState)
    }
  }
})

test('expected combined state, with abort', () => {
  const controller = new AbortController()
  controller.abort()
  const { signal } = controller
  for (const { statuses } of fixtures) {
    const inputs = statuses.map((status) => ({ state: { ...partial, status } }))
    const expectedState = { ...partial, status: 'aborted' }
    for (const permuted of permute(inputs)) {
      assert.deepEqual(combineStates(permuted, { signal }), expectedState)
    }
  }
})

test('arithmetic test', () => {
  const counts = [
    [1, 2, 3, 4],
    [1, 2, 3, 4],
    [1, 2, 3, 4],
  ]
  const expected = {
    haveCount: 3,
    haveBytes: 6,
    wantCount: 9,
    wantBytes: 12,
    error: null,
    status: 'downloaded',
  }
  const inputs = counts.map(([haveCount, haveBytes, wantCount, wantBytes]) => {
    return {
      state: {
        haveCount,
        haveBytes,
        wantCount,
        wantBytes,
        error: null,
        status: /** @type {const} */ ('downloaded'),
      },
    }
  })
  assert.deepEqual(combineStates(inputs), expected)
})

/**
 * Returns an iterator of all permutations of the given array.
 *
 * Implements [Heap's algorithm][0].
 *
 * [0]: https://en.wikipedia.org/wiki/Heap%27s_algorithm
 *
 * @template T
 * @param {ReadonlyArray<T>} arr
 * @returns {IterableIterator<ReadonlyArray<T>>}
 */
function* permute(arr) {
  const c = Array(arr.length).fill(0)

  yield arr

  let i = 1
  while (i < arr.length) {
    if (c[i] < i) {
      arr = swapping(arr, i % 2 ? c[i] : 0, i)
      yield arr
      c[i] += 1
      i = 1
    } else {
      c[i] = 0
      i += 1
    }
  }
}

/**
 * @template T
 * @param {ReadonlyArray<T>} arr
 * @param {number} index1
 * @param {number} index2
 * @returns {ReadonlyArray<T>}
 */
function swapping(arr, index1, index2) {
  const result = arr.slice()
  result[index1] = arr[index2]
  result[index2] = arr[index1]
  return result
}
