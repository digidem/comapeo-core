// @ts-check
import test from 'brittle'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'

test('remote bitfield - findFirst, findLast', function (t) {
  const b = new RemoteBitfield()

  b.set(1_000_000, true)

  t.is(b.findFirst(true, 0), 1_000_000)
  t.is(b.findLast(true, 2_000_000), 1_000_000)
})

test('remote bitfield - findLast, findFirst from insert', function (t) {
  // Regression test for bug in RemoteBitfield which was not updating the index
  // when inserting a new bitfield.
  const b = new RemoteBitfield()

  const size = 100
  const arr = new Uint32Array(size).fill(2 ** 32 - 1)
  b.insert(0, arr)

  t.is(b.findFirst(false, 0), size * 32)
  t.is(b.findLast(true, size * 32 + 1_000_000), size * 32 - 1)
})
