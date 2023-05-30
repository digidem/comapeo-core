import RandomAccessMemory from 'random-access-memory'
import b4a from 'b4a'
import Database from 'better-sqlite3'

import { CoreManager } from '../../lib/core-manager/index.js'
import { Datastore } from '../../lib/datastore/index.js'
import { Sqlite } from '../../lib/sqlite.js'

import { createIdentityKeys } from './index.js'

/**
 *
 * @param {Object} options
 * @param {import('../../lib/datastore/index.js').DataTypeOptions[]} options.dataTypes
 * @returns {Promise<Datastore>}
 */
export async function createDatastore(options) {
  const { dataTypes } = options
  const { identityKeyPair, keyManager } = createIdentityKeys()
  const keyPair = keyManager.getHypercoreKeypair('data', b4a.alloc(32))
  const coreManager = new CoreManager({
    keyManager,
    projectKey: keyPair.publicKey,
    projectSecretKey: keyPair.secretKey,
    storage: RandomAccessMemory,
    db: new Database(':memory:'),
  })

  const datastore = new Datastore({
    namespace: 'data',
    coreManager,
    sqlite: new Sqlite(':memory:'),
    keyPair,
    identityPublicKey: identityKeyPair.publicKey,
    dataTypes,
  })

  await datastore.ready()
  return { datastore, coreManager, keyPair, identityKeyPair }
}
