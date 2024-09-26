import test from 'node:test'
import assert from 'node:assert/strict'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'

test('remote bitfield - findFirst, findLast', () => {
  const b = new RemoteBitfield()

  b.set(1_000_000, true)

  assert.equal(b.findFirst(true, 0), 1_000_000)
  assert.equal(b.findLast(true, 2_000_000), 1_000_000)
})

test('remote bitfield - findLast, findFirst from insert', () => {
  // Regression test for bug in RemoteBitfield which was not updating the index
  // when inserting a new bitfield.
  const b = new RemoteBitfield()

  const size = 100
  const arr = new Uint32Array(size).fill(2 ** 32 - 1)
  b.insert(0, arr)

  assert.equal(b.findFirst(false, 0), size * 32)
  assert.equal(b.findLast(true, size * 32 + 1_000_000), size * 32 - 1)
})
