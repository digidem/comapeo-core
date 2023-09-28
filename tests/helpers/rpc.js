import NoiseSecretStream from '@hyperswarm/secret-stream'

/**
 * @param {import('../../src/rpc/index.js').MapeoRPC} rpc1
 * @param {import('../../src/rpc/index.js').MapeoRPC} rpc2
 * @param { {kp1?: import('@hyperswarm/secret-stream'), kp2?: import('@hyperswarm/secret-stream')} } [keyPairs]
 * @returns {() => Promise<[void, void]>}
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

  // @ts-expect-error
  rpc1.connect(n1)
  // @ts-expect-error
  rpc2.connect(n2)

  return async function destroy() {
    return Promise.all([
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n1.on('close', res)
          n1.destroy()
        })
      ),
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n2.on('close', res)
          n2.destroy()
        })
      ),
    ])
  }
}
