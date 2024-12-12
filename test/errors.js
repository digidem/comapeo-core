import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { NotFoundError, nullIfNotFound } from '../src/errors.js'

describe('NotFoundError', () => {
  test('subclasses Error', () => {
    assert(new NotFoundError() instanceof Error)
  })

  test('with no error message', () => {
    assert.equal(new NotFoundError().message, 'Not found')
  })

  test('with custom error message', () => {
    assert.equal(new NotFoundError('foo').message, 'foo')
  })
})

describe('nullIfNotFound', () => {
  test('returns null if passed a NotFoundError', () => {
    assert.equal(nullIfNotFound(new NotFoundError()), null)
  })

  test('throws if passed something other than a NotFoundError', () => {
    assert.throws(() => nullIfNotFound(new Error('foo')), { message: 'foo' })
  })
})
