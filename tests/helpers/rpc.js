import NoiseSecretStream from '@hyperswarm/secret-stream'

/**
 * @typedef {ReturnType<import('@hyperswarm/secret-stream').keyPair>} KeyPair
 */

/**
 * @param {import('../../src/rpc/index.js').LocalPeers} rpc1
 * @param {import('../../src/rpc/index.js').LocalPeers} rpc2
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
