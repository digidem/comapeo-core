/**
* @module CoreReplicator
 */

import { CoreIdCache } from "./authstore/coreIdCache"
import { Sqlite } from "./sqlite"

export class CoreReplicator {
  /** @type {string} */
  #coreId
  #masterCore
  /** @type {Corestore} */
  #store
  /** @type {CoreIdCache} */
  #coreIdCache
  /** @type {string} */
  #extensionNamespace = 'replicator'
  /** @type {any} */
  #extension
  /**
* Create a CoreReplicator instance. This class is in charge of replicating cores belonging to a namespace in a corestore with other peers. This is acomplished by registering an hypercore extension.
* @param {string} coreId - core public key to use as master core to register the extension in
* @param {Corestore} store - set of cores to share
* @param {CoreIdCache} coreIdCache  
  */
  constructor(coreId, store, coreIdCache){
    this.#coreId = coreId
    this.#store = store
    this.#coreIdCache = coreIdCache
    this.#masterCore = this.#store.get({key:this.#coreId})
  }

  /**
* @param {StoreType} type
  */
  replicate(type){
    const ids = this.#coreIdCache.getByStoreType(type).map(records => records.coreId)
    this.#extension = this.#masterCore.registerExtension(`${this.#extensionNamespace}/${type}`,
      {onmessage: this.onmessage})
    this.#masterCore.on('peer-add', peer => ids.forEach(id => this.#extension.send(id,peer)))
  }

  onmessage(msg, peer) {
    // here we should receive keys from peers through extension. The peer doesn't have control over the type of store to ask.
  }
}
