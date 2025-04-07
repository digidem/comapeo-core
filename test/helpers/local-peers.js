import NoiseSecretStream from '@hyperswarm/secret-stream'
import { Transform } from 'streamx'
import pDefer from 'p-defer'

/**
 * @typedef {ReturnType<import('@hyperswarm/secret-stream').keyPair>} KeyPair
 */

/**
 * @param {import('../../src/local-peers.js').LocalPeers} rpc1
 * @param {import('../../src/local-peers.js').LocalPeers} rpc2
 * @param { {kp1?: KeyPair, kp2?: KeyPair} } [keyPairs]
 */
export function replicate(
  rpc1,
  rpc2,
  {
    // Keep keypairs deterministic for tests, since we use peer.publicKey as an identifier.
    kp1 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(0)),
    kp2 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(1)),
  } = {}
) {
  const n1 = new NoiseSecretStream(true, undefined, {
    keyPair: kp1,
  })
  const n2 = new NoiseSecretStream(false, undefined, {
    keyPair: kp2,
  })

  // @ts-expect-error
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  rpc1.connect(n1)
  rpc2.connect(n2)

  /** @param {Error} [e] */
  return async function destroy(e) {
    return Promise.all([
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n1.on('close', res)
          n1.destroy(e)
        })
      ),
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n2.on('close', res)
          n2.destroy(e)
        })
      ),
    ])
  }
}

/**
 * @param {import('../../src/local-peers.js').LocalPeers} rpc1
 * @param {import('../../src/local-peers.js').LocalPeers} rpc2
 * @param { {kp1?: KeyPair, kp2?: KeyPair} } [keyPairs]
 */
export function breakableReplicate(
  rpc1,
  rpc2,
  {
    // Keep keypairs deterministic for tests, since we use peer.publicKey as an identifier.
    kp1 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(0)),
    kp2 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(1)),
  } = {}
) {
  const n1 = new NoiseSecretStream(true, undefined, {
    keyPair: kp1,
  })
  const n2 = new NoiseSecretStream(false, undefined, {
    keyPair: kp2,
  })

  const pauseable1 = makePauseable()
  const pauseable2 = makePauseable()

  // @ts-expect-error
  pauseable1.stream
    .pipe(n1.rawStream)
    .pipe(pauseable2.stream)
    .pipe(n2.rawStream)
    .pipe(n1.rawStream)

  rpc1.connect(n1)
  rpc2.connect(n2)

  /** @param {Error} [e] */
  async function destroy(e) {
    return Promise.all([
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n1.on('close', res)
          n1.destroy(e)
        })
      ),
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n2.on('close', res)
          n2.destroy(e)
        })
      ),
    ])
  }

  return {
    destroy,
    pauseable1,
    pauseable2,
  }
}

let count = 0
function makePauseable() {
  let onResume = null
  let destroyed = false
  let hasListen = false
  const id = count++

  const stream = new Transform({
    highWaterMark: 0,
    transform(chunk, cb) {
      console.log({ id, chunk })
      if (destroyed) {
        this.push(null)
        cb(new Error('Destroyed'))
        return
      }
      if (onResume) {
        hasListen = true
        onResume.promise
          .then(() => {
            if (destroyed) {
              this.push(null)
              cb(new Error('Destroyed'))
              return
            }
            this.push(chunk)
            cb()
          })
          .catch(cb)
      } else {
        this.push(chunk)
        cb()
      }
    },
  })

  function destroy() {
    destroyed = true
    if (onResume && hasListen) {
      onResume.reject(new Error('Destroyed before flush'))
    } else stream.destroy()
  }
  function toggle() {
    hasListen = false
    if (!onResume) {
      console.log('pause')
      // Pause
      onResume = pDefer()
    } else {
      // Unpause
      onResume.resolve()
      onResume = null
    }
  }

  return { stream, toggle, destroy }
}
