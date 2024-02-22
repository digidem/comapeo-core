// @ts-check
import test from 'brittle'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'

test('remote bitfield - findFirst', function (t) {
  const b = new RemoteBitfield()

  b.set(1000000, true)

  t.is(b.findFirst(true, 0), 1000000)
})
