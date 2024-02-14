// @ts-check
import test from 'brittle'
import { assert, exhaustivenessError, setHas } from '../src/utils.js'

test('assert()', (t) => {
  t.execution(() => assert(true, 'should work'))
  t.exception(() => assert(false, 'uh oh'), /uh oh/)
})

test('exhaustivenessError', () => {
  const bools = [true, false]
  bools.forEach((bool) => {
    switch (bool) {
      case true:
      case false:
        break
      default:
        throw exhaustivenessError(bool)
    }
  })
})

test('setHas()', (t) => {
  const set = new Set([1, 2, 3])
  t.ok(setHas(set)(1))
  t.absent(setHas(set)(9))
})
