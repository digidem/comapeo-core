import { combineStates } from '../../src/blob-store/live-download.js'
import test from 'brittle'

const partial = {
  haveCount: 0,
  haveBytes: 0,
  wantCount: 0,
  wantBytes: 0,
  error: null,
}

const fixtures = [
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
]

test('expected combined state, no error or abort', (t) => {
  for (const { statuses, expected } of fixtures) {
    const inputs = statuses.map((status) => ({ state: { ...partial, status } }))
    const expectedState = { ...partial, status: expected }
    for (const permuted of permute(inputs)) {
      t.alike(combineStates(permuted), expectedState)
    }
  }
})

test('expected combined state, with error', (t) => {
  for (const { statuses } of fixtures) {
    const inputs = statuses.map((status) => ({ state: { ...partial, status } }))
    inputs.push({ state: { ...partial, error: new Error(), status: 'error' } })
    const expectedState = { ...partial, error: new Error(), status: 'error' }
    for (const permuted of permute(inputs)) {
      t.alike(combineStates(permuted), expectedState)
    }
  }
})

test('expected combined state, with abort', (t) => {
  const controller = new AbortController()
  controller.abort()
  const { signal } = controller
  for (const { statuses } of fixtures) {
    const inputs = statuses.map((status) => ({ state: { ...partial, status } }))
    const expectedState = { ...partial, status: 'aborted' }
    for (const permuted of permute(inputs)) {
      t.alike(combineStates(permuted, { signal }), expectedState)
    }
  }
})

test('arithmetic test', (t) => {
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
        status: 'downloaded',
      },
    }
  })
  t.alike(combineStates(inputs), expected)
})

/**
 * Returns an iterator of all permutations of the given array.
 * From https://stackoverflow.com/a/37580979/3071863
 * @template T
 * @param {Array<T>} arr
 * @returns {IterableIterator<Array<T>>}
 */
export function* permute(arr) {
  var length = arr.length,
    c = Array(length).fill(0),
    i = 1,
    k,
    p

  yield arr.slice()
  while (i < length) {
    if (c[i] < i) {
      k = i % 2 && c[i]
      p = arr[i]
      arr[i] = arr[k]
      arr[k] = p
      ++c[i]
      i = 1
      yield arr.slice()
    } else {
      c[i] = 0
      ++i
    }
  }
}
