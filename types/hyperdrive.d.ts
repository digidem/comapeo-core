declare module 'hyperdrive' {
  import Corestore from 'corestore'
  import Hypercore from 'hypercore'
  import Hyperblobs, { BlobId } from 'hyperblobs'
  import Hyperbee from 'hyperbee'
  import { Readable, Writable } from 'streamx'
  import { TypedEmitter } from 'tiny-typed-emitter'
  import { JsonValue } from 'type-fest'

  interface HyperdriveOptions {
    onwait: () => void
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

  interface HyperdriveGetOpts {
    wait?: boolean
    timeout?: number
  }

  namespace Hyperdrive {
    interface HyperdriveEntryValue {
      executable: boolean // whether the blob at path is an executable
      linkname: null | string // if entry not symlink, otherwise a string to the entry this links to
      blob: BlobId // a Hyperblob id that can be used to fetch the blob associated with this entry
      metadata: JsonValue
    }
    export interface HyperdriveEntry
      extends Hyperbee.HyperbeeEntry<HyperdriveEntryValue> {}
  }

  class Hyperdrive extends TypedEmitter<HyperdriveEvents> {
    constructor(
      corestore: Corestore,
      key?: null | Buffer,
      opts?: HyperdriveOptions
    )
    constructor(corestore: Corestore, opts?: HyperdriveOptions)
    readonly id: null | string // String containing the id (z-base-32 of the public key) identifying this drive.
    readonly core: Hypercore // Hypercore used for drive.db
    readonly blobs: null | Hyperblobs
    readonly key: Buffer | null
    readonly discoveryKey: Buffer | null
    readonly contentKey: Buffer | null // The public key of the Hyperblobs instance holding blobs associated with entries in the drive.
    readonly db: Hyperbee
    readonly version: number
    ready(): Promise<void>
    update(options?: { wait?: boolean }): Promise<Boolean>
    createReadStream(
      path: string,
      opts?: { core?: Hypercore; start?: number; length?: number; end?: number }
    ): Readable
    entry(
      path: string,
      opts?: HyperdriveGetOpts
    ): Promise<Hyperdrive.HyperdriveEntry | null>
    getBlobs(): Promise<Hyperblobs>
    get(
      path: string,
      opts?: { follow?: boolean } & HyperdriveGetOpts
    ): Promise<Buffer | null>
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
    download(folder?: string, opts?: { recursive?: boolean }): Readable
    readdir(folder: string): Readable
    mirror(): any
    batch(): any
    clear(
      path: string,
      opts?: { diff?: boolean }
    ): Promise<{ blocks: number } | null>
    close(): Promise<void>
  }

  export = Hyperdrive
}
