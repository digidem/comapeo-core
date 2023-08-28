import NoiseSecretStream from '@hyperswarm/secret-stream'

export function replicate(rpc1, rpc2) {
  const n1 = new NoiseSecretStream(true, undefined, {
    // Keep keypairs deterministic for tests, since we use peer.publicKey as an identifier.
    keyPair: NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(0)),
  })
  const n2 = new NoiseSecretStream(false, undefined, {
    keyPair: NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(1)),
  })
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  rpc1.connect(n1)
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
