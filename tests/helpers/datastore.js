import ram from 'random-access-memory'
import Corestore from 'corestore'
import b4a from 'b4a'

import { DataStore } from '../../lib/datastore/index.js'
import { Sqlite } from '../../lib/sqlite.js'

import { createIdentityKeys } from './index.js'

export async function createDataStore (options) {
    const { dataTypes } = options
    const { identityKeyPair, keyManager } = createIdentityKeys()
    const keyPair = keyManager.getHypercoreKeypair('data', b4a.alloc(32))
    const corestore = new Corestore(ram)
    const sqlite = new Sqlite(':memory:')

    const datastore = new DataStore({
    corestore,
    sqlite,
    keyPair,
        identityPublicKey: identityKeyPair.publicKey,
        dataTypes
    })

    await datastore.ready()
    return datastore
}
