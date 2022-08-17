import crypto from 'hypercore-crypto'

export function getDiscoveryKey(publicKey) {
  const key =
    typeof publicKey === 'string' ? Buffer.from(publicKey, 'hex') : publicKey
  return crypto.discoveryKey(key)
}
