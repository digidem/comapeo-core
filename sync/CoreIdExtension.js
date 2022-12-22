/**
* @module CoreIdExtension
*/
import { CoreIdCache } from './CoreIdCache.js'

export class CoreIdExtension {
  /** @type {Hypercore} */
  #core
  /** @type {CoreIdCache} */
  #coreIdCache
  /** @type {string} */
  #extensionNamespace = 'share'
  /** @type {any} */
  #extension
  /**
  * Create a CoreReplicator instance. This class is in charge of replicating cores belonging to a namespace in a corestore with other peers. This is acomplished by registering an hypercore extension.
  * @param {Hypercore} core - core public key to use as master core to register the extension in
  * @param {CoreIdCache} coreIdCache  
  */
  constructor(core, coreIdCache){
    this.#core = core 
    this.#coreIdCache = coreIdCache
  }

  /**
  * @param {StoreType} type
  */
  share(type){
    const ids = this.#coreIdCache.getByStoreType(type).map(records => records.coreId)
    this.#extension = this.#core.registerExtension(`${this.#extensionNamespace}/${type}`,
      {onmessage: this.onmessage})
    this.#core.on('peer-add', 
      /** @param {any} peer */
      peer => ids.forEach(id => this.#extension.send(id,peer)))
  }

  /**
  * @param {string} msg
  * @param {any} peer
  */
  onmessage(msg, peer) {
    console.log(msg,peer)
    // here we should receive keys from peers through extension. The peer doesn't have control over the type of store to ask.
  }
}
