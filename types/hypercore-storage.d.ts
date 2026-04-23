declare module 'hypercore-storage' {
  import { Readable } from 'streamx'

  namespace HypercoreStorage {
    interface CorestoreStorageOptions {
      alwaysRecover?: boolean
      readOnly?: boolean
      allowBackup?: boolean
      wait?: boolean
      id?: string | null
      tableCacheIndexAndFilterBlocks?: boolean
      blockCache?: boolean
      optimizeFiltersForMemory?: boolean
    }

    interface CorePointer {
      version: number
      corePointer: number
      dataPointer: number
      dependencies: CorePointer[]
    }

    interface CoreInfo {
      discoveryKey: Buffer
      core: CorePointer
      auth?: any
      head?: any
      hints?: any
    }

    interface CoreStreamEntry {
      core: CorePointer
      auth?: any
      head?: any
    }
  }

  class CorestoreStorage {
    constructor(path: string, opts?: HypercoreStorage.CorestoreStorageOptions)
    constructor(db: any, opts?: HypercoreStorage.CorestoreStorageOptions)

    readonly bootstrap: boolean
    readonly path: string
    readonly alwaysRecover: boolean
    readonly readOnly: boolean
    readonly allowBackup: boolean
    readonly deviceFile: any | null
    readonly wait: boolean
    readonly id: string | null
    readonly version: number
    readonly migrating: any | null

    get opened(): boolean
    get closed(): boolean

    ready(): Promise<void>
    close(): Promise<void>
    compact(): Promise<void>
    audit(): Promise<void>
    deleteCore(ptr: HypercoreStorage.CorePointer): Promise<void>
    clear(): Promise<void>

    createCoreStream(): Readable<HypercoreStorage.CoreStreamEntry>
    createAliasStream(namespace: Buffer): Readable<any>
    createDiscoveryKeyStream(namespace: Buffer): Readable<any>
    createBlockStream(ptr: HypercoreStorage.CorePointer): Readable<any>
    createBitfieldStream(ptr: HypercoreStorage.CorePointer): Readable<any>
    createUserDataStream(ptr: HypercoreStorage.CorePointer): Readable<any>
    createTreeNodeStream(ptr: HypercoreStorage.CorePointer): Readable<any>
    createLocalStream(): Readable<any>

    static isCoreStorage(db: any): boolean
    static from(db: any | string): CorestoreStorage
  }

  export = CorestoreStorage
}
