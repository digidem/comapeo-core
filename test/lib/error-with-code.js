import assert from 'node:assert/strict'
import test from 'node:test'
import { ErrorWithCode } from '../../src/lib/error-with-code.js'

test('ErrorWithCode', () => {
  const err = new ErrorWithCode('MY_CODE', 'my message')
  assert.equal(err.code, 'MY_CODE')
  assert.equal(err.message, 'my message')
  assert(err instanceof Error)
})
