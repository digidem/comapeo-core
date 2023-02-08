import { CoreManager } from '../../lib/core-manager/index.js'
import Sqlite from 'better-sqlite3'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import NoiseSecretStream from '@hyperswarm/secret-stream'

export function createCoreManager ({
  rootKey = randomBytes(16),
  projectKey = randomBytes(32)
} = {}) {
  const db = new Sqlite(':memory:')
  const keyManager = new KeyManager(rootKey)
  return new CoreManager({
    db,
    keyManager,
    storage: RAM,
    projectKey
  })
}

export function replicate(cm1, cm2) {
  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  cm1.replicate(n1)
  cm2.replicate(n2)

  return async function destroy () {
    return Promise.all([
      new Promise((res) => {
        n1.on('close', res)
        n1.destroy()
      }),
      new Promise((res) => {
        n2.on('close', res)
        n2.destroy()
      })
    ])
  }
}
