/**
* @module CoreIdExtension
*/
export class CoreIdExtension {
  /** @type {Hypercore} */
  #core
  /** @type {Corestore} */
  #store
  /** @type {import('./CoreIdCache.js').CoreIdCache} */
  #coreIdCache
  /** @type {string} */
  #extensionNamespace = 'share'
  /** @type {any} */
  #extension
  /**
  * Create a CoreReplicator instance. This class is in charge of replicating cores belonging to a namespace in a corestore with other peers. This is acomplished by registering an hypercore extension.
  * @param {Hypercore} core - core to use as master core to register the extension in
  * @param {Corestore} store - corestore instance
  * @param {import('./CoreIdCache.js').CoreIdCache} coreIdCache  
  */
  constructor(core, store, coreIdCache){
    this.#core = core 
    this.#store = store
    this.#coreIdCache = coreIdCache
  }
  /**
  * @callback OnMessage 
  * @param {Object} msg - message object
  * @param {String[]} msg.coreIds
  * @param {String} msg.namespace
  * @param {Object} peer - socket peer
  */
  /**
  * @param {StoreType} type
  * @param {OnMessage} onmessage
  */
  share(type, onmessage){
    const ids = this.#coreIdCache.getByStoreType(type).map(records => records.coreId)

    this.#extension = this.#core.registerExtension(
      `${this.#extensionNamespace}/${type}`,
      {onmessage, encoding: 'json'}
    )
    
    this.#core.on('peer-add', 
      /** @param {any} peer */
      peer => this.#extension.send({coreIds: ids, namespace:type}, peer)
    )
  }

  /**
  * @param {Object} msg
  * @param {string[]} msg.coreIds
  * @param {StoreType} msg.namespace
  * @param {any} peer
  */
  onmessage(msg, peer) {
    console.log(msg,peer)
    const subStore = this.#store.namespace(msg.namespace)
    msg.coreIds.forEach(coreId => subStore.get({key:coreId}))
  }
}
