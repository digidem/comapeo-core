/**
* @module CoreIdExtension
*/
export class CoreIdExtension {
  /** @type {Hypercore} */
  #core
  /** @type {import('./CoreIdCache.js').CoreIdCache} */
  #coreIdCache
  /** @type {string} */
  #extensionPrefix = 'share'
  /** @type {any} */
  #extension
  /**
  * Create a CoreReplicator instance. This class is in charge of sharing a set of cores by registering an hypercore extension.
  * @param {Hypercore} core - core to use as master core to register the extension in
  * @param {import('./CoreIdCache.js').CoreIdCache} coreIdCache the cache to retrieve the set of coreIds to share
  */
  constructor(core, coreIdCache){
    this.#core = core 
    this.#coreIdCache = coreIdCache
  }

  /**
  * @callback OnMessage 
  * @param {CoreIdRecordAggregate[]} msg - message object
  * @param {Object} peer - socket peer
  */
  /**
  * @param {StoreNamespace} namespace
  * @param {OnMessage} onmessage
  */
  share(namespace, onmessage){
    const doc = this.#coreIdCache.getByStoreNamespace(namespace)

    this.#extension = this.#core.registerExtension(
      `${this.#extensionPrefix}/${namespace}`,
      {onmessage, encoding: 'json'}
    )
    
    this.#core.on('peer-add', 
      /** @param {any} peer */
      peer => this.#extension.send(doc, peer)
    )
  }
}
