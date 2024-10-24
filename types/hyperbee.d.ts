declare module 'hyperbee' {
  import type { TypedEmitter } from 'tiny-typed-emitter'
  import Hypercore from 'hypercore'
  import { EventEmitter } from 'events'
  import { Readable } from 'streamx'

  type Encoding<T> = 'binary' | 'utf-8' | 'ascii' | 'json' | AbstractEncoding<T>

  declare namespace Hyperbee {
    interface HyperbeeOptions<T = any> {
      keyEncoding?: Encoding<T>
      valueEncoding?: Encoding<T>
    }

    interface HyperbeeEntry<T = any> {
      seq: number
      key: string
      value: T
    }

    interface PutOptions<T = any> {
      cas?: (prev: HyperbeeEntry<T>, next: HyperbeeEntry<T>) => boolean
    }

    interface DelOptions<T = any> {
      cas?: (prev: T) => boolean
    }

    interface ReadStreamRange {
      gt?: string
      gte?: string
      lt?: string
      lte?: string
    }

    interface ReadStreamOptions {
      reverse?: boolean
      limit?: number
    }

    interface HistoryStreamOptions extends ReadStreamOptions {
      live?: boolean
      reverse?: boolean
      gte?: number
      gt?: number
      lte?: number
      lt?: number
      // These options missing from the docs
      keyEncoding?: Encoding<T>
      valueEncoding?: Encoding<T>
      encoding?: Encoding<T>
    }

    interface DiffStreamEntry<T = any> {
      left: T
      right: T
    }

    interface DiffStreamOptions extends ReadStreamOptions {}

    interface GetAndWatchOptions {
      keyEncoding?: 'binary' | 'utf-8' | 'ascii' | 'json' | AbstractEncoding
      valueEncoding?: 'binary' | 'utf-8' | 'ascii' | 'json' | AbstractEncoding
    }

    interface SubDatabaseOptions extends HyperbeeOptions<any> {
      sep?: Buffer
    }

    interface HeaderOptions {}
  }

  class Hyperbee<T = any> {
    constructor(core: Hypercore, options?: Hyperbee.HyperbeeOptions<T>)

    ready(): Promise<void>
    close(): Promise<void>

    readonly core: Hypercore
    readonly version: number
    // Below are not yet implemented on the version of hyperbee we're using
    // readonly id: string
    // readonly key: null | Buffer
    // readonly discoveryKey: null | Buffer
    // readonly writable: boolean
    // readonly readable: boolean

    put(
      key: string,
      value?: any,
      options?: Hyperbee.PutOptions<T>
    ): Promise<void>
    del(key: string, options?: Hyperbee.DelOptions<T>): Promise<void>
    get(key: string): Promise<Hyperbee.HyperbeeEntry<T> | null>
    getBySeq(
      seq: number,
      options?: any
    ): Promise<Omit<Hyperbee.HyperbeeEntry<T>, 'seq'> | null>

    batch(): HyperbeeBatch<T>
    replicate(isInitiatorOrStream: any): Readable
    createReadStream(
      range?: Hyperbee.ReadStreamRange,
      options?: Hyperbee.ReadStreamOptions
    ): Readable<Hyperbee.HyperbeeEntry<T>>
    peek(
      range?: Hyperbee.ReadStreamRange,
      options?: Hyperbee.ReadStreamOptions
    ): Promise<Hyperbee.HyperbeeEntry<T> | null>
    createHistoryStream(options?: Hyperbee.HistoryStreamOptions): Readable<
      Hyperbee.HyperbeeEntry<T> & {
        type: 'put' | 'del'
      }
    >
    createDiffStream(
      otherVersion: number,
      options?: Hyperbee.DiffStreamOptions
    ): Readable<Hyperbee.DiffStreamEntry<T>>

    getAndWatch(
      key: string,
      options?: Hyperbee.GetAndWatchOptions
    ): Promise<EntryWatcher<T>>
    watch(
      range?: Hyperbee.ReadStreamRange
    ): AsyncIterable<[any, any]> & { close: () => Promise<void> }

    checkout(version: number): Hyperbee
    snapshot(): Hyperbee

    sub(prefix: string, options?: Hyperbee.SubDatabaseOptions): Hyperbee
    getHeader(options?: any): Promise<any>

    static isHyperbee(core: Hypercore, options?: any): Promise<boolean>
  }

  class HyperbeeBatch<T> {
    put(key: string, value?: T, options?: PutOptions<T>): Promise<void>
    get(key: string): Promise<HyperbeeEntry<T> | null>
    del(key: string, options?: DelOptions<T>): Promise<void>
    flush(): Promise<void>
    close(): Promise<void>
  }

  class EntryWatcher<T> extends TypedEmitter<{
    update: () => void
  }> {
    node: { seq: number; key: string; value: T }

    close(): Promise<void>
  }

  interface AbstractEncoding<T = any> {
    encode: (data: T) => Buffer
    encode: (data: T, buffer: Buffer) => Buffer
    encode: (data: T, buffer: Buffer, offset: number) => Buffer
    encode: (data: T, buffer?: Buffer, offset: number) => Buffer
    decode: (buffer: Buffer) => T
    decode: (buffer: Buffer, offset: number) => T
    decode: (buffer: Buffer, offset: number, end: number) => T
    decode: (buffer: Buffer, offset?: number, end: number) => T
  }

  export = Hyperbee
}
