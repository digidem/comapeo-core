import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { getErrorCode } from '../../src/errors.js'

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

    const testCases = [new ErrorWithInheritedCode()]

    for (const testCase of testCases) {
      assert.equal(getErrorCode(testCase), 'foo')
    }
  })
})
