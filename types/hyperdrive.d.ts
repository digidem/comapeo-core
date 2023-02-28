declare module 'hyperdrive' {
  import Corestore from 'corestore'
  import Hypercore from 'hypercore'
  import { Readable, Writable } from 'streamx'
  import { TypedEmitter } from 'tiny-typed-emitter'

  interface HyperdriveOptions {
    onwait: () => void
  }

  interface HyperdriveEntry {
    seq: number
    key: string
    value: {
      executable: boolean // whether the blob at path is an executable
      linkname: null | string // if entry not symlink, otherwise a string to the entry this links to
      blob: {
        // a Hyperblob id that can be used to fetch the blob associated with this entry
        blockOffset: number
        blockLength: number
        byteOffset: number
        byteLength: number
      }
      metadata: null | object
    }
  }

  type Range =
    | {
        start: number
        end: number
        linear: boolean
      }
    | {
        blocks: number[]
      }

  interface HyperdriveEvents {
    close: () => void
    ready: () => void
    blobs: (blobs: Hyperblobs) => void
    'content-key': (contentKey: Buffer) => void
  }

  // This is enough for what we need for now
  class Hyperblobs {
    readonly core: Hypercore
  }

  interface HyperdriveGetOpts {
    wait?: boolean
    timeout?: number
  }

  class Hyperdrive extends TypedEmitter<HyperdriveEvents> {
    constructor(corestore: Corestore, key: Buffer, opts: HyperdriveOptions)
    constructor(corestore: Corestore, opts: HyperdriveOptions)
    readonly core: Hypercore
    readonly blobs: null | Hyperblobs
    readonly key: Buffer | null
    readonly discoveryKey: Buffer | null
    readonly contentKey: Buffer | null
    readonly db: any // Hyperbee
    readonly files: any // Hyperbee sub
    readonly version: number
    ready(): Promise<void>
    update(): Promise<Boolean>
    createReadStream(
      path: string,
      opts?: { core?: Hypercore; start?: number; length?: number; end?: number }
    ): Readable
    entry(path: string, opts?: HyperdriveGetOpts): Promise<HyperdriveEntry>
    getBlobs(): Promise<any>
    get(path: string, opts?: HyperdriveGetOpts): Promise<Buffer>
    entries(opts: any): Readable
    put(
      path: string,
      blob: Buffer,
      opts?: { executable?: boolean; metadata?: any }
    ): Promise<void>
    createWriteStream(
      path: string,
      opts?: { executable?: boolean; metadata?: any }
    ): Writable
    del(path: string): Promise<void>
    checkout(version: number): Hyperdrive
    diff(version: number, folder: string, opts?: any): Readable
    downloadDiff(version: number, folder: string, opts?: any): Readable
    downloadRange(
      dbRanges: Range,
      blobRanges: Range
    ): { done: Promise<void>; destroy: () => void }
    list(folder: string, opts?: { recursive?: boolean }): Readable
    download(folder: string, opts?: { recursive?: boolean }): Readable
    readdir(folder: string): Readable
    mirror(): any
    batch(): any
  }

  export = Hyperdrive
}
