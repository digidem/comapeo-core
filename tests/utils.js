// @ts-check
import test from 'brittle'
import { assert, setHas } from '../src/utils.js'

test('assert()', (t) => {
  t.execution(() => assert(true, 'should work'))
  t.exception(() => assert(false, 'uh oh'), /uh oh/)
})

test('setHas()', (t) => {
  const set = new Set([1, 2, 3])
  t.ok(setHas(set)(1))
  t.absent(setHas(set)(9))
})
