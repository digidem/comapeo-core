import test from 'node:test'
import assert from 'node:assert/strict'
import Bitfield from 'bitfield'
import * as rle from '../src/core-manager/bitfield-rle.js'

test('encodes and decodes', function () {
  var bits = new Bitfield(1024)
  var deflated = rle.encode(toUint32Array(bits.buffer))
  assert(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  assert.deepEqual(
    inflated,
    toUint32Array(bits.buffer),
    'decodes to same buffer'
  )
})

test('encodes and decodes with all bits set', function () {
  var bits = new Bitfield(1024)

  for (var i = 0; i < 1024; i++) bits.set(i, true)

  var deflated = rle.encode(toUint32Array(bits.buffer))
  assert(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  assert.deepEqual(
    inflated,
    toUint32Array(bits.buffer),
    'decodes to same buffer'
  )
})

test('encodes and decodes with some bits set', function () {
  var bits = new Bitfield(1024)

  bits.set(500, true)
  bits.set(501, true)
  bits.set(502, true)

  bits.set(999, true)
  bits.set(1000, true)
  bits.set(0, true)

  var deflated = rle.encode(toUint32Array(bits.buffer))
  assert(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  assert.deepEqual(
    inflated,
    toUint32Array(bits.buffer),
    'decodes to same buffer'
  )
})

test('encodes and decodes with random bits set', function () {
  var bits = new Bitfield(8 * 1024)

  for (var i = 0; i < 512; i++) {
    bits.set(Math.floor(Math.random() * 8 * 1024), true)
  }

  var deflated = rle.encode(toUint32Array(bits.buffer))
  assert(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  assert.deepEqual(
    inflated,
    toUint32Array(bits.buffer),
    'decodes to same buffer'
  )
})

test('encodes and decodes with random bits set (not power of two)', function () {
  var bits = new Bitfield(8 * 1024)

  for (var i = 0; i < 313; i++) {
    bits.set(Math.floor(Math.random() * 8 * 1024), true)
  }

  var deflated = rle.encode(toUint32Array(bits.buffer))
  assert(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  assert.deepEqual(
    inflated,
    toUint32Array(bits.buffer),
    'decodes to same buffer'
  )
})

test('encodes empty bitfield', function () {
  var deflated = rle.encode(new Uint32Array())
  var inflated = rle.decode(deflated)
  assert.deepEqual(inflated, new Uint32Array(), 'still empty')
})

test('throws on bad input', function () {
  assert.throws(function () {
    rle.decode(Buffer.from([100, 0, 0, 0]))
  }, 'invalid delta count')
  // t.exception.all also catches RangeErrors, which is what we expect from this
  assert.throws(function () {
    rle.decode(
      Buffer.from([
        10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0,
        10, 0,
      ])
    )
  }, 'missing delta')
})

test('not power of two', function () {
  var deflated = rle.encode(toUint32Array([255, 255, 255, 240]))
  var inflated = rle.decode(deflated)
  assert.deepEqual(
    inflated,
    toUint32Array([255, 255, 255, 240]),
    'output equal to input'
  )
})

/** @param {Bitfield | Uint8Array | Array<number>} b */
function toUint32Array(b) {
  if (Array.isArray(b)) {
    b = Buffer.from(b)
  }
  const buf = b instanceof Bitfield ? b.buffer : b
  return new Uint32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4)
}
