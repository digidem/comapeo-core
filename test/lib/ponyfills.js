import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { abortSignalAny, setIsSubsetOf } from '../../src/lib/ponyfills.js'

describe('abortSignalAny', () => {
  test('handles empty iterables', () => {
    assert.notEqual(abortSignalAny([]).aborted, 'not immediately aborted')
    assert.notEqual(
      abortSignalAny(new Set()).aborted,
      'not immediately aborted'
    )
  })

  test('aborts immediately if one of the arguments was aborted', () => {
    const result = abortSignalAny([
      new AbortController().signal,
      AbortSignal.abort('foo'),
      AbortSignal.abort('ignored'),
      new AbortController().signal,
    ])

    assert(result.aborted, 'immediately aborted')
    assert.equal(result.reason, 'foo', 'gets first abort reason')
  })

  test('aborts as soon as one of its arguments aborts', () => {
    const a = new AbortController()
    const b = new AbortController()
    const c = new AbortController()

    const result = abortSignalAny([a.signal, b.signal, c.signal])

    assert.notEqual(result.aborted, 'not immediately aborted')

    b.abort('foo')
    c.abort('ignored')

    assert(result.aborted, 'aborted')
    assert.equal(result.reason, 'foo', 'gets first abort reason')
  })

  test('handles non-array iterables', () => {
    const a = new AbortController()
    const b = new AbortController()
    const c = new AbortController()

    const result = abortSignalAny(new Set([a.signal, b.signal, c.signal]))

    b.abort('foo')

    assert(result.aborted, 'aborted')
  })
})

describe('setIsSubsetOf', () => {
  const empty = new Set()
  const justTwo = new Set([2])
  const evens = new Set([2, 4, 6])
  const odds = new Set([1, 3, 5])
  const firstSix = new Set([1, 2, 3, 4, 5, 6])

  test('sets are subsets of themselves', () => {
    for (const set of [empty, justTwo, evens, odds, firstSix]) {
      assert(setIsSubsetOf(set, set))
    }
  })

  test('returns true for subsets', () => {
    assert(setIsSubsetOf(empty, justTwo))
    assert(setIsSubsetOf(justTwo, evens))
    assert(setIsSubsetOf(evens, firstSix))
    assert(setIsSubsetOf(odds, firstSix))
  })

  test('returns false for non-subsets', () => {
    assert(!setIsSubsetOf(justTwo, empty))
    assert(!setIsSubsetOf(firstSix, evens))
    assert(!setIsSubsetOf(evens, odds))
  })
})
