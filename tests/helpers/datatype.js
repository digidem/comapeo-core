import { randomBytes } from 'crypto'
import Corestore from 'corestore'
import ram from 'random-access-memory'
import MultiCoreIndexer from 'multi-core-indexer'

import { DataType } from '../../lib/datatype/index.js'
import { Sqlite } from '../../lib/sqlite.js'

import { createIdentityKeys } from './index.js'

export async function createDataType(options) {
  const { name, schema, extraColumns, blockPrefix } = options
  let { corestore, sqlite } = options
  const { identityKeyPair, keyManager } = createIdentityKeys()
  const identityId = identityKeyPair.publicKey.toString('hex')
  const keyPair = keyManager.getHypercoreKeypair(name, randomBytes(32))

  if (!corestore) {
    corestore = new Corestore(ram)
  }

  if (!sqlite) {
    sqlite = new Sqlite(':memory:')
  }

  const dataType = new DataType({
    name,
    schema,
    blockPrefix,
    identityPublicKey: identityKeyPair.publicKey,
    corestore,
    keyPair,
    sqlite,
    extraColumns,
  })

  await dataType.ready()

  let indexer
  if (options.indexer !== false) {
    const cores = [...corestore.cores.values()]
    indexer = new MultiCoreIndexer(cores, {
      storage: (key) => {
        return new ram(key)
      },
      batch: (entries) => {
        dataType.index(entries.map((entry) => entry.block))
      },
    })
  }

  return {
    name,
    identityId,
    dataType,
    indexer,
  }
}
