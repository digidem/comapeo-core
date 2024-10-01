import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidHost } from '../../src/lib/is-valid-host.js'

test('too short', () => {
  assert(!isValidHost(''))
})

test('too long', () => {
  assert(!isValidHost('x'.repeat(4097)))
})

test('has auth', () => {
  assert(!isValidHost('user@example.com'))
  assert(!isValidHost(':password@example.com'))
  assert(!isValidHost('user:password@example.com'))
})

test('has path', () => {
  assert(!isValidHost('example.com/foo'))
})

test('has search', () => {
  assert(!isValidHost('example.com?foo=bar'))
})

test('has hash', () => {
  assert(!isValidHost('example.com#foo'))
})

test('has empty path, search, and/or hash', () => {
  assert(!isValidHost('example.com/'))
  assert(!isValidHost('example.com?'))
  assert(!isValidHost('example.com#'))
  assert(!isValidHost('example.com/#'))
  assert(!isValidHost('example.com/?'))
  assert(!isValidHost('example.com?#'))
  assert(!isValidHost('example.com/?#'))
})

test('invalid as URLs', () => {
  assert(!isValidHost(' '))
  assert(!isValidHost(''))
})

test('IPv4 is valid', () => {
  assert(isValidHost('0.0.0.0'))
  assert(isValidHost('127.0.0.1'))
  assert(isValidHost('100.64.0.42'))
  assert(isValidHost('100.64.0.42:1234'))
})

test('IPv6 is valid', () => {
  assert(isValidHost('::'))
  assert(isValidHost('2001:0db8:0000:0000:0000:0000:0000:0000'))
  assert(isValidHost('[::]'))
  assert(isValidHost('[2001:0db8:0000:0000:0000:0000:0000:0000]'))

  assert(isValidHost('[2001:0db8:0000:0000:0000:0000:0000:0000]:1234'))
})

test('IPv6-coded IPv4s are valid', () => {
  assert(isValidHost('[0:0:0:0:0:ffff:6440:002a]'))
  assert(isValidHost('[0:0:0:0:0:ffff:6440:002a]:1234'))
})

test('other hostnames are valid', () => {
  assert(isValidHost('example'))
  assert(isValidHost('example:1234'))
  assert(isValidHost('example.com'))
  assert(isValidHost('example.com:1234'))
})
