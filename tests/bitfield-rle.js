import test from 'brittle'
import Bitfield from 'bitfield'
import * as rle from '../src/core-manager/bitfield-rle.js'

test('encodes and decodes', function (t) {
  var bits = new Bitfield(1024)
  var deflated = rle.encode(Buffer.from(bits.buffer))
  t.ok(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  t.alike(inflated, Buffer.from(bits.buffer), 'decodes to same buffer')
  t.end()
})

test('encodingLength', function (t) {
  var bits = new Bitfield(1024)
  var len = rle.encodingLength(bits.buffer)
  t.ok(len < bits.buffer.length, 'is smaller')
  var deflated = rle.encode(bits.buffer)
  t.alike(
    len,
    deflated.length,
    'encoding length is similar to encoded buffers length'
  )
  t.end()
})

test('encodes and decodes with all bits set', function (t) {
  var bits = new Bitfield(1024)

  for (var i = 0; i < 1024; i++) bits.set(i, true)

  var deflated = rle.encode(Buffer.from(bits.buffer))
  t.ok(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  t.alike(inflated, Buffer.from(bits.buffer), 'decodes to same buffer')
  t.end()
})

test('encodes and decodes with some bits set', function (t) {
  var bits = new Bitfield(1024)

  bits.set(500, true)
  bits.set(501, true)
  bits.set(502, true)

  bits.set(999, true)
  bits.set(1000, true)
  bits.set(0, true)

  var deflated = rle.encode(Buffer.from(bits.buffer))
  t.ok(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  t.alike(inflated, Buffer.from(bits.buffer), 'decodes to same buffer')
  t.end()
})

test('encodes and decodes with random bits set', function (t) {
  var bits = new Bitfield(8 * 1024)

  for (var i = 0; i < 512; i++) {
    bits.set(Math.floor(Math.random() * 8 * 1024), true)
  }

  var deflated = rle.encode(Buffer.from(bits.buffer))
  t.ok(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  t.alike(inflated, Buffer.from(bits.buffer), 'decodes to same buffer')
  t.end()
})

test('encodes and decodes with random bits set (not power of two)', function (t) {
  var bits = new Bitfield(8 * 1024)

  for (var i = 0; i < 313; i++) {
    bits.set(Math.floor(Math.random() * 8 * 1024), true)
  }

  var deflated = rle.encode(Buffer.from(bits.buffer))
  t.ok(deflated.length < bits.buffer.length, 'is smaller')
  var inflated = rle.decode(deflated)
  t.alike(inflated, Buffer.from(bits.buffer), 'decodes to same buffer')
  t.end()
})

test('encodes empty bitfield', function (t) {
  var deflated = rle.encode(Buffer.alloc(0))
  var inflated = rle.decode(deflated)
  t.alike(inflated, Buffer.alloc(0), 'still empty')
  t.end()
})

test('throws on bad input', function (t) {
  t.exception(function () {
    rle.decode(Buffer.from([100]))
  }, 'invalid delta count')
  t.exception(function () {
    rle.decode(
      Buffer.from([
        10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0, 10, 0,
        10, 0,
      ])
    )
  }, 'missing delta')
  t.end()
})

test('not power of two', function (t) {
  var deflated = rle.encode(Buffer.from([255, 255, 255, 240]))
  var inflated = rle.decode(deflated)
  t.alike(inflated, Buffer.from([255, 255, 255, 240]), 'output equal to input')
  t.end()
})
