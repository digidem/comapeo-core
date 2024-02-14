// @ts-check
import test from 'brittle'
import { assert, ExhaustivenessError, setHas } from '../src/utils.js'

test('assert()', (t) => {
  t.execution(() => assert(true, 'should work'))
  t.exception(() => assert(false, 'uh oh'), /uh oh/)
})

test('ExhaustivenessError', (t) => {
  const bools = [true, false]
  t.execution(() => {
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

test('setHas()', (t) => {
  const set = new Set([1, 2, 3])
  t.ok(setHas(set)(1))
  t.absent(setHas(set)(9))
})
