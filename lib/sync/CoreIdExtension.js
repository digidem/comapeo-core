/**
* @module CoreIdExtension
*/
export class CoreIdExtension {
  /** @type {Hypercore} */
  #core
  /** @type {import('./CoreIdCache.js').CoreIdCache} */
  #coreIdCache
  /** @type {any} */
  #extension

  /**
  * @callback OnMessage 
  * @param {CoreId[]} coreIds - list of coreIds from 'auth'
  * @param {Object} peer - socket peer
  */
  /**
  * Create a CoreReplicator instance. This class is in charge of sharing a set of cores by registering an hypercore extension.
  * @param {Hypercore} core - core to use as master core to register the extension in
  * @param {import('./CoreIdCache.js').CoreIdCache} coreIdCache the cache to retrieve the set of coreIds to share
  * @param {OnMessage} [onmessage] - callback that handles recieved messages from a peer
  */
  constructor(core, coreIdCache, onmessage = () => {}){
    this.#core = core 
    this.#coreIdCache = coreIdCache
    this.#extension = this.#core.registerExtension('shareAuth', {onmessage, encoding: 'json'})
  }

  share(){
    const coreIds = this.#coreIdCache
    .getByStoreNamespace('auth')
    .map(({coreIds}) => coreIds).flat()

    this.#core.on('peer-add', 
      /** @param {any} peer */
      peer => this.#extension.send(coreIds, peer)
    )
  }
}
