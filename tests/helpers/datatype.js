import { randomBytes } from 'crypto'
import RandomAccessMemory from 'random-access-memory'
import MultiCoreIndexer from 'multi-core-indexer'
import Database from 'better-sqlite3'

import { DataType } from '../../lib/datatype/index.js'
import { Sqlite } from '../../lib/sqlite.js'

import { createIdentityKeys } from './index.js'
import { CoreManager } from '../../lib/core-manager/index.js'

export async function createDataType(options) {
  const { name, namespace, extraColumns } = options
  let { sqlite } = options
  const { identityKeyPair, keyManager } = createIdentityKeys()
  const identityId = identityKeyPair.publicKey.toString('hex')
  const keyPair = keyManager.getHypercoreKeypair(name, randomBytes(32))

  if (!sqlite) {
    sqlite = new Sqlite(':memory:')
  }

  const coreManager = new CoreManager({
    keyManager,
    projectKey: keyPair.publicKey,
    projectSecretKey: keyPair.secretKey,
    storage: RandomAccessMemory,
    db: new Database(':memory:'),
  })

  const { core } = coreManager.getWriterCore(namespace)

  const dataType = new DataType({
    namespace,
    name,
    core,
    schemaType: 'Observation',
    schemaVersion: 5,
    identityPublicKey: identityKeyPair.publicKey,
    coreManager,
    keyPair,
    sqlite,
    extraColumns,
  })

  await dataType.ready()

  const indexer = new MultiCoreIndexer(dataType.cores, {
    storage: (key) => {
      return new RandomAccessMemory(key)
    },
    batch: (entries) => {
      console.log('batch', entries)
      dataType.index(entries)
    },
  })

  return {
    name,
    identityId,
    dataType,
    indexer,
    coreManager,
  }
}
