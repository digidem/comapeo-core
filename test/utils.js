import test from 'node:test'
import assert from 'node:assert/strict'
import { isDefined, setHas } from '../src/utils.js'
import { ExhaustivenessError } from '../src/errors.js'

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

test('isDefined()', () => {
  assert(isDefined(123))
  assert(isDefined(null))
  assert(!isDefined(undefined))
})

test('setHas()', () => {
  const set = new Set([1, 2, 3])
  assert(setHas(set)(1))
  assert(!setHas(set)(9))
})
