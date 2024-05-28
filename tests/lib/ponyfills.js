import test from 'node:test'
import assert from 'node:assert/strict'
import { abortSignalAny } from '../../src/lib/ponyfills.js'

test('abortSignalAny() handles empty iterables', () => {
  assert.notEqual(abortSignalAny([]).aborted, 'not immediately aborted')
  assert.notEqual(abortSignalAny(new Set()).aborted, 'not immediately aborted')
})

test('abortSignalAny() aborts immediately if one of the arguments was aborted', () => {
  const result = abortSignalAny([
    new AbortController().signal,
    AbortSignal.abort('foo'),
    AbortSignal.abort('ignored'),
    new AbortController().signal,
  ])

  assert(result.aborted, 'immediately aborted')
  assert.equal(result.reason, 'foo', 'gets first abort reason')
})

test('abortSignalAny() aborts as soon as one of its arguments aborts', () => {
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

test('abortSignalAny() handles non-array iterables', () => {
  const a = new AbortController()
  const b = new AbortController()
  const c = new AbortController()

  const result = abortSignalAny(new Set([a.signal, b.signal, c.signal]))

  b.abort('foo')

  assert(result.aborted, 'aborted')
})
