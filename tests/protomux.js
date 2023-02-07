import Protomux from 'protomux'
import SecretStream from '@hyperswarm/secret-stream'
import test from 'brittle'
import c from 'compact-encoding'
import { setTimeout } from 'timers/promises'

test('basic', async function (t) {
  const a = new Protomux(new SecretStream(true))
  const b = new Protomux(new SecretStream(false))

  replicate(a, b)

  // b.pair({ protocol: 'foo' }, async () => setTimeout(1000))

  const p = a.createChannel({
    protocol: 'foo',
    onopen () {
      t.pass('a remote opened')
    }
  })

  p.open()

  p.addMessage({
    encoding: c.string
  }).send('hello world')

  const bp = b.createChannel({
    protocol: 'foo'
  })

  t.plan(2)

  bp.open()

  await setTimeout(100)

  bp.addMessage({ encoding: c.string,
    onmessage (message) {
      t.is(message, 'hello world')
    } })
})

function replicate (a, b) {
  a.stream.rawStream.pipe(b.stream.rawStream).pipe(a.stream.rawStream)
}
