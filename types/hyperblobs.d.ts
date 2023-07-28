declare module 'hyperblobs' {
  import Hypercore from 'hypercore'
  import { Readable, Writable } from 'streamx'

  // TODO: Update to match implentation
  // https://github.com/holepunchto/hyperblobs/blob/60774a0861dfcb0d11238a05d550c6faf443922f/lib/streams.js#L36
  type BlobWriteStreamOpts = any

  // TODO: Update to match implementation
  // https://github.com/holepunchto/hyperblobs/blob/60774a0861dfcb0d11238a05d550c6faf443922f/lib/streams.js#L89
  type BlobReadStreamOpts = any

  class BlobWriteStream extends Writable {
    constructor(opts: BlobWriteStreamOpts)
  }
  class BlobReadStream extends Readable {
    constructor(opts: BlobReadStreamOpts)
  }

  namespace Hyperblobs {
    interface BlobId {
      blockOffset: number
      blockLength: number
      byteOffset: number
      byteLength: number
    }
  }

  class Hyperblobs {
    readonly core: Hypercore
    readonly blockSize: number

    constructor(core: Hypercore, opts?: { blocksize?: number })

    get feed(): Hypercore

    get locked(): boolean

    put(
      blob: Buffer,
      opts?: {
        blockSize?: number // The block size that will be used when storing large blobs.
        start?: number // Relative offset to start within the blob
        end?: number // End offset within the blob (inclusive)
        length?: number // Number of bytes to read.
        core?: Hypercore // A custom core to write (overrides the default core)
      }
    ): Promise<Hyperblobs.BlobId>

    get(
      id: Hyperblobs.BlobId,
      opts?: {
        core?: Hypercore
        wait?: boolean
        timeout?: number
      } & BlobReadStreamOpts
    ): Promise<Buffer | null>

    clear(
      id: Hyperblobs.BlobId,
      opts?: { diff?: boolean }
    ): Promise<{ blocks: number } | null>

    createWriteStream(opts?: BlobWriteStreamOpts): BlobWriteStream
    createReadStream(
      id: Hyperblobs.BlobId,
      opts?: BlobReadStreamOpts
    ): BlobReadStream
  }

  export = Hyperblobs
}
