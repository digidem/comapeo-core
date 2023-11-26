declare module 'multi-core-indexer' {
  import { ReadableEvents } from 'streamx'

  type IndexStateCurrent = 'idle' | 'indexing'
  interface IndexState {
    current: IndexStateCurrent
    remaining: number
    entriesPerSecond: number
  }
  interface IndexStreamState {
    remaining: number
    drained: boolean
  }
  interface IndexEvents {
    'index-state': (state: IndexState) => void
    indexing: () => void
    idle: () => void
  }
  type IndexStreamEvents<T> = ReadableEvents<T> & {
    drained: () => void
    indexing: () => void
  }
  type ValueEncoding = 'binary' | 'utf-8' | 'json'
  interface Entry<T extends ValueEncoding = 'binary'> {
    index: number
    key: Buffer
    block: T extends 'binary' ? Buffer : T extends 'utf-8' ? string : JSONValue
  }
  type JSONValue =
    | null
    | string
    | number
    | boolean
    | {
        [x: string]: JSONValue
      }
    | Array<JSONValue>

  export = MultiCoreIndexer
  /** @typedef {string | ((name: string) => import('random-access-storage'))} StorageParam */
  /** @typedef {ValueEncoding} ValueEncoding */
  /** @typedef {IndexState} IndexState */
  /** @typedef {IndexEvents} IndexEvents */
  /**
   * @template {ValueEncoding} [T='binary']
   * @typedef {Entry<T>} Entry
   */
  /**
   * @template {ValueEncoding} [T='binary']
   * @extends {TypedEmitter<IndexEvents>}
   */
  declare class MultiCoreIndexer<
    T extends ValueEncoding = 'binary'
  > extends TypedEmitter<IndexEvents> {
    /**
     *
     * @param {StorageParam} storage
     * @returns {(name: string) => import('random-access-storage')}
     */
    static defaultStorage(
      storage: StorageParam
    ): (name: string) => import('random-access-storage')
    /**
     *
     * @param {import('hypercore')<T, any>[]} cores
     * @param {object} opts
     * @param {(entries: Entry<T>[]) => Promise<void>} opts.batch
     * @param {StorageParam} opts.storage
     * @param {number} [opts.maxBatch=100]
     */
    constructor(
      cores: import('hypercore')<T, any>[],
      {
        batch,
        maxBatch,
        storage,
      }: {
        batch: (entries: Entry<T>[]) => Promise<void>
        storage: StorageParam
        maxBatch?: number | undefined
      }
    )
    /**
     * @type {IndexState}
     */
    get state(): IndexState
    /**
     * Add a core to be indexed
     * @param {import('hypercore')<T, any>} core
     */
    addCore(core: import('hypercore')<T, any>): void
    /**
     * Resolves when indexing state is 'idle'
     */
    idle(): Promise<void>
    close(): Promise<void>
    #private
  }
  declare namespace MultiCoreIndexer {
    export { StorageParam, ValueEncoding, IndexState, IndexEvents, Entry }
  }
  import { TypedEmitter } from 'tiny-typed-emitter'
  type StorageParam =
    | string
    | ((name: string) => import('random-access-storage'))
}
