// @ts-check
import test from 'brittle'
import { setHas } from '../src/utils.js'

test('setHas()', (t) => {
  const set = new Set([1, 2, 3])
  t.ok(setHas(set)(1))
  t.absent(setHas(set)(9))
})
