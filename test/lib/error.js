import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  ErrorWithCode,
  getErrorCode,
  getErrorMessage,
} from '../../src/lib/error.js'

describe('ErrorWithCode', () => {
  test('ErrorWithCode with two arguments', () => {
    const err = new ErrorWithCode('MY_CODE', 'my message')
    assert.equal(err.code, 'MY_CODE')
    assert.equal(err.message, 'my message')
    assert(err instanceof Error)
  })

  test('ErrorWithCode with three arguments', () => {
    const otherError = new Error('hello')
    const err = new ErrorWithCode('MY_CODE', 'my message', {
      cause: otherError,
    })
    assert.equal(err.code, 'MY_CODE')
    assert.equal(err.message, 'my message')
    assert.equal(err.cause, otherError)
    assert(err instanceof Error)
  })
})

describe('getErrorCode', () => {
  test('from values without a string code', () => {
    class ErrorWithNumericCode extends Error {
      code = 123
    }

    const testCases = [
      undefined,
      null,
      'ignored',
      { code: 'ignored' },
      new Error('has no code'),
      new ErrorWithNumericCode(),
    ]

    for (const testCase of testCases) {
      assert.equal(getErrorCode(testCase), undefined)
    }
  })

  test('from Errors with a string code', () => {
    class ErrorWithInheritedCode extends Error {
      get code() {
        return 'foo'
      }
    }

    const testCases = [
      new ErrorWithCode('foo', 'message'),
      new ErrorWithInheritedCode(),
    ]

    for (const testCase of testCases) {
      assert.equal(getErrorCode(testCase), 'foo')
    }
  })
})

describe('getErrorMessage', () => {
  test('from objects without a string message', () => {
    const testCases = [
      undefined,
      null,
      ['ignored'],
      { message: 123 },
      {
        get message() {
          throw new Error('this should not crash')
        },
      },
    ]

    for (const testCase of testCases) {
      assert.equal(getErrorMessage(testCase), 'unknown error')
    }
  })

  test('from objects with a string message', () => {
    class WithInheritedMessage {
      get message() {
        return 'foo'
      }
    }

    const testCases = [
      { message: 'foo' },
      new Error('foo'),
      {
        get message() {
          return 'foo'
        },
      },
      new WithInheritedMessage(),
    ]

    for (const testCase of testCases) {
      assert.equal(getErrorMessage(testCase), 'foo')
    }
  })
})
