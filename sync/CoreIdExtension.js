/**
* @module CoreIdExtension
*/
export class CoreIdExtension {
  /** @type {Hypercore} */
  #core
  /** @type {import('./CoreIdCache.js').CoreIdCache} */
  #coreIdCache
  /** @type {string} */
  #extensionNamespace = 'share'
  /** @type {any} */
  #extension
  /**
  * Create a CoreReplicator instance. This class is in charge of replicating cores belonging to a namespace in a corestore with other peers. This is acomplished by registering an hypercore extension.
  * @param {Hypercore} core - core to use as master core to register the extension in
  * @param {import('./CoreIdCache.js').CoreIdCache} coreIdCache  
  */
  constructor(core, coreIdCache){
    this.#core = core 
    this.#coreIdCache = coreIdCache
  }

  /** 
  * @typedef {Object} ExtensionMessages
  * @property {String[]} coreIds
  * @property {String} namespace
  * @property {String} identityId
  */
  /**
  * @callback OnMessage 
  * @param {ExtensionMessages} msg - message object
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
}
