import { TypedEmitter } from 'tiny-typed-emitter'
import { encode, decode, getVersionId, parseVersionId } from '@mapeo/schema'
import MultiCoreIndexer from 'multi-core-indexer'
import pDefer from 'p-defer'
import { discoveryKey } from 'hypercore-crypto'

/**
 * @typedef {import('multi-core-indexer').IndexEvents} IndexEvents
 */
/**
 * @typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */
/**
 * @typedef {import('../datatype/index.js').MapeoDocTablesMap} MapeoDocTablesMap
 */
/**
 * @typedef {object} DefaultEmitterEvents
 * @property {(eventName: keyof IndexEvents, listener: (...args: any[]) => any) => void} newListener
 * @property {(eventName: keyof IndexEvents, listener: (...args: any[]) => any) => void} removeListener
 */
/**
 * @template T
 * @template {keyof any} K
 * @typedef {T extends any ? Omit<T, K> : never} OmitUnion
 */

const NAMESPACE_SCHEMAS = /** @type {const} */ ({
  data: ['observation'],
  config: ['preset', 'field', 'projectSettings', 'deviceInfo', 'icon'],
  auth: ['coreOwnership', 'role'],
})

/**
 * @typedef {typeof NAMESPACE_SCHEMAS} NamespaceSchemas
 */

/**
 * @template {keyof NamespaceSchemas} [TNamespace=keyof NamespaceSchemas]
 * @template {NamespaceSchemas[TNamespace][number]} [TSchemaName=NamespaceSchemas[TNamespace][number]]
 * @extends {TypedEmitter<IndexEvents & DefaultEmitterEvents>}
 */
export class DataStore extends TypedEmitter {
  #coreManager
  #namespace
  #batch
  #writerCore
  #coreIndexer
  /** @type {Map<string, import('p-defer').DeferredPromise<void>>} */
  #pending = new Map()

  /**
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {TNamespace} opts.namespace
   * @param {(entries: MultiCoreIndexer.Entry<'binary'>[]) => Promise<void>} opts.batch
   * @param {MultiCoreIndexer.StorageParam} opts.storage
   */
  constructor({ coreManager, namespace, batch, storage }) {
    super()
    this.#coreManager = coreManager
    this.#namespace = namespace
    this.#batch = batch
    this.#writerCore = coreManager.getWriterCore(namespace).core
    const cores = coreManager.getCores(namespace).map((cr) => cr.core)
    this.#coreIndexer = new MultiCoreIndexer(cores, {
      storage,
      batch: (entries) => this.#handleEntries(entries),
    })
    coreManager.on('add-core', (coreRecord) => {
      if (coreRecord.namespace !== namespace) return
      this.#coreIndexer.addCore(coreRecord.core)
    })

    // Forward events from coreIndexer
    this.on('newListener', (eventName, listener) => {
      if (['newListener', 'removeListener'].includes(eventName)) return
      this.#coreIndexer.on(eventName, listener)
    })
    this.on('removeListener', (eventName, listener) => {
      if (['newListener', 'removeListener'].includes(eventName)) return
      this.#coreIndexer.off(eventName, listener)
    })
  }

  get namespace() {
    return this.#namespace
  }

  get schemas() {
    // Return a shallow copy (slice(0)) to avoid mutation bugs
    return NAMESPACE_SCHEMAS[this.#namespace].slice(0)
  }

  get writerCore() {
    return this.#writerCore
  }

  getIndexState() {
    return this.#coreIndexer.state
  }

  /**
   *
   * @param {MultiCoreIndexer.Entry<'binary'>[]} entries
   */
  async #handleEntries(entries) {
    // This is needed to avoid the batch running before the append resolves, but
    // I think this is only necessary when using random-access-memory, and will
    // not be an issue when the indexer is on a separate thread.
    await new Promise((res) => setTimeout(res, 0))
    await this.#batch(entries)
    // Writes to the writerCore need to wait until the entry is indexed before
    // returning, so we check if any incoming entry has a pending promise
    for (const entry of entries) {
      if (!entry.key.equals(this.#writerCore.key)) continue
      const versionId = getVersionId({
        coreDiscoveryKey: discoveryKey(entry.key),
        index: entry.index,
      })
      const pending = this.#pending.get(versionId)
      if (!pending) continue
      pending.resolve()
    }
  }

  /**
   * UNSAFE: Does not check links: [] refer to a valid doc - should only be used
   * internally.
   *
   * Write a doc, must be one of the schema types supported by the namespace of
   * this DataStore.
   * @template {Extract<Parameters<encode>[0], { schemaName: TSchemaName }>} TDoc
   * @param {TDoc} doc
   * @returns {Promise<Extract<MapeoDoc, TDoc>>}
   */
  async write(doc) {
    // @ts-ignore
    if (!NAMESPACE_SCHEMAS[this.#namespace].includes(doc.schemaName)) {
      throw new Error(
        `Schema '${doc.schemaName}' is not allowed in namespace '${
          this.#namespace
        }'`
      )
    }
    const block = encode(doc)

    const { length } = await this.#writerCore.append(block)
    const index = length - 1
    const coreDiscoveryKey = this.#writerCore.discoveryKey
    if (!coreDiscoveryKey) {
      throw new Error('Writer core is not ready')
    }
    const versionId = getVersionId({ coreDiscoveryKey, index })
    /** @type {import('p-defer').DeferredPromise<void>} */
    const deferred = pDefer()
    this.#pending.set(versionId, deferred)
    await deferred.promise

    return /** @type {Extract<MapeoDoc, TDoc>} */ (
      decode(block, { coreDiscoveryKey, index })
    )
  }

  /**
   *
   * @param {string} versionId
   * @returns {Promise<MapeoDoc>}
   */
  async read(versionId) {
    const { coreDiscoveryKey, index } = parseVersionId(versionId)
    const core = this.#coreManager.getCoreByDiscoveryKey(coreDiscoveryKey)
    if (!core) throw new Error('Invalid versionId')
    const block = await core.get(index, { wait: false })
    if (!block) throw new Error('Not Found')
    return decode(block, { coreDiscoveryKey, index })
  }

  /** @param {Buffer} buf} */
  async writeRaw(buf) {
    const { length } = await this.#writerCore.append(buf)
    const index = length - 1
    const coreDiscoveryKey = this.#writerCore.discoveryKey
    if (!coreDiscoveryKey) {
      throw new Error('Writer core is not ready')
    }
    const versionId = getVersionId({ coreDiscoveryKey, index })
    return versionId
  }

  /** @param {string} versionId */
  async readRaw(versionId) {
    const { coreDiscoveryKey, index } = parseVersionId(versionId)
    const core = this.#coreManager.getCoreByDiscoveryKey(coreDiscoveryKey)
    if (!core) throw new Error('core not found')
    const block = await core.get(index, { wait: false })
    if (!block) throw new Error('Not Found')
    return block
  }
}
