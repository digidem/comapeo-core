import test from 'node:test'
import assert from 'node:assert/strict'
import timingSafeEqual from '../../src/lib/timing-safe-equal.js'

test('comparing buffers', () => {
  const a = Buffer.from([1, 2, 3])
  const b = Buffer.from([1, 2, 3])
  const c = Buffer.from([4, 5, 6])
  const d = Buffer.from([7])

  assert(timingSafeEqual(a, a))
  assert(timingSafeEqual(a, b))

  assert(!timingSafeEqual(a, c))
  assert(!timingSafeEqual(a, d))
})

test('comparing strings', () => {
  assert(timingSafeEqual('foo', 'foo'))
  assert(!timingSafeEqual('foo', 'bar'))
  assert(!timingSafeEqual('foo', 'x'))
  assert(
    !timingSafeEqual(String.fromCharCode(0x49), String.fromCharCode(0x6c49)),
    'characters that might truncate the same are still different'
  )
  assert(
    !timingSafeEqual('\udc69', '\udc6a'),
    'lone surrogates compare correctly'
  )
})
