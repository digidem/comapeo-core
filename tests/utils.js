// @ts-check
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assert as utilsAssert,
  ExhaustivenessError,
  setHas,
} from '../src/utils.js'

test('assert()', () => {
  assert.doesNotThrow(() => utilsAssert(true, 'should work'))
  assert.throws(() => utilsAssert(false, 'uh oh'), { message: 'uh oh' })
})

test('ExhaustivenessError', () => {
  const bools = [true, false]
  assert.doesNotThrow(() => {
    bools.forEach((bool) => {
      switch (bool) {
        case true:
        case false:
          break
        default:
          throw new ExhaustivenessError(bool)
      }
    })
  })
})

test('setHas()', () => {
  const set = new Set([1, 2, 3])
  assert(setHas(set)(1))
  assert(!setHas(set)(9))
})
