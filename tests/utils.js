// @ts-check
import test from 'tape'
import { rejects } from './helpers/assertions.js'
import { assert, ExhaustivenessError, setHas } from '../src/utils.js'

test('assert()', (t) => {
  t.doesNotThrow(() => assert(true, 'should work'))
  rejects(t, () => assert(false, 'uh oh'), /uh oh/)
  t.end()
})

test('ExhaustivenessError', (t) => {
  const bools = [true, false]
  t.doesNotThrow(() => {
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
  t.end()
})

test('setHas()', (t) => {
  const set = new Set([1, 2, 3])
  t.ok(setHas(set)(1))
  t.notOk(setHas(set)(9))
  t.end()
})
