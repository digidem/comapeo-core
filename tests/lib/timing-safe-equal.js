// @ts-check
import test from 'brittle'
import timingSafeEqual from '../../src/lib/timing-safe-equal.js'

test('comparing buffers', (t) => {
  const a = Buffer.from([1, 2, 3])
  const b = Buffer.from([1, 2, 3])
  const c = Buffer.from([4, 5, 6])
  const d = Buffer.from([7])

  t.ok(timingSafeEqual(a, a))
  t.ok(timingSafeEqual(a, b))

  t.absent(timingSafeEqual(a, c))
  t.absent(timingSafeEqual(a, d))
})

test('comparing strings', (t) => {
  t.ok(timingSafeEqual('foo', 'foo'))
  t.absent(timingSafeEqual('foo', 'bar'))
  t.absent(timingSafeEqual('foo', 'x'))
  t.absent(
    timingSafeEqual(String.fromCharCode(0x49), String.fromCharCode(0x6c49)),
    'characters that might truncate the same are still different'
  )
  t.absent(
    timingSafeEqual('\udc69', '\udc6a'),
    'lone surrogates compare correctly'
  )
})
