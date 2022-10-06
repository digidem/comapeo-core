// TODO: create types for these modules
declare module 'hyperswarm'
declare module '@hyperswarm/secret-stream' {
  import { Duplex as NodeDuplex } from 'stream'
  import { Duplex, DuplexEvents } from 'streamx'

  interface Opts {
    autostart?: boolean
    // TODO: Use https://github.com/chm-diederichs/noise-handshake/blob/main/noise.js for specific patterns
    pattern?: string
    remotePublicKey?: Buffer
    keyPair?: { publicKey: Buffer; secretKey: Buffer }
    handshake?: {
      tx: Buffer
      rx: Buffer
      hash: Buffer
      publicKey: Buffer
      remotePublicKey: Buffer
    }
  }

  type NoiseStreamEvents = {
    connect: () => void
  }

  class NoiseSecretStream<
    RawStream extends NodeDuplex | Duplex = Duplex
  > extends Duplex<
    any,
    any,
    any,
    any,
    true,
    true,
    DuplexEvents<any, any> & NoiseStreamEvents
  > {
    readonly publicKey: Buffer
    readonly remotePublicKey: Buffer
    readonly handshakeHash: Buffer
    readonly rawStream: RawStream
    readonly isInitiator: boolean
    readonly noiseStream: this
    readonly opened: Promise<boolean>
    readonly userData: any

    constructor(isInitiator: boolean, rawStream?: RawStream, opts?: Opts)

    static keyPair(seed?: Buffer): {
      publicKey: Buffer
      secretKey: Buffer
    }

    start(rawStream?: NodeDuplex, opts?: Opts): void
    setTimeout(ms?: number): void
    setKeepAlive(ms?: number): void
  }

  export = NoiseSecretStream
}
declare module '@hyperswarm/testnet'
declare module 'base32.js'
declare module '@mapeo/crypto'
declare module 'hypercore'
declare module 'corestore'
declare module 'random-access-storage' {
  import EventEmitter from 'events'

  type Cb<T> = (err: any, val?: T) => void

  class Request {
    readonly type: number
    readonly offset: number
    readonly size: number
    readonly data: Buffer
    readonly storage: RandomAccessStorage

    constructor(
      self: RandomAccessStorage,
      type: number,
      offset: number,
      size: number,
      data: Buffer,
      cb: Cb<any>
    )

    callback: Cb<any>
  }

  class RandomAccessStorage extends EventEmitter {
    readonly opened: boolean
    readonly suspended: boolean
    readonly closed: boolean
    readonly unlinked: boolean
    readonly writing: boolean
    readonly readable: boolean
    readonly writable: boolean
    readonly deletable: boolean
    readonly truncatable: boolean
    readonly statable: boolean

    constructor(opts?: {
      open?: boolean
      read?: boolean
      write?: boolean
      del?: boolean
      truncate?: boolean
      stat?: boolean
      suspend?: boolean
      close?: boolean
      unlink?: boolean
    })

    read(offset: number, size: number, cb: Cb<any>): void
    write(offset: number, data: Buffer, cb?: Cb<any>): void
    del(offset: number, size: number, cb?: Cb<any>): void
    truncate(offset: number, cb?: Cb<any>): void
    stat(cb: Cb<any>): void
    open(cb?: Cb<any>): void
    suspend(cb?: Cb<any>): void
    close(cb?: Cb<any>): void
    unlink(cb?: Cb<any>): void
    run(req: Request, writing?: boolean): void
  }

  export = RandomAccessStorage
}
declare module 'random-access-memory' {
  import RandomAccessStorage from 'random-access-storage'

  class RandomAccessMemory extends RandomAccessStorage {
    readonly length: number
    readonly pageSize: number
    readonly buffers: Buffer[]

    constructor(
      opts?:
        | number
        | Buffer
        | { length?: number; buffer?: Buffer; pageSize?: number }
    )

    toBuffer(): Buffer
    clone(): RandomAccessMemory
  }

  export = RandomAccessMemory
}
declare module 'random-access-file'
declare module 'randombytes'
declare module 'b4a'
