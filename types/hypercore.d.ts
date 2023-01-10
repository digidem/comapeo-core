declare module 'hypercore' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import RandomAccessStorage from 'random-access-storage'
  import { type Duplex } from 'streamx'

  interface HypercoreEvents {
    'peer-add'(peer: any): void
    'peer-remove'(peer: any): void
    download(index: number, byteLength: number, from: any): void
    ready(): void
    close(allClosed: boolean): void
    upload(index: number, byteLength: number, to: any): void
    truncate(index: number, fork: number): void
    append(): void
  }

  type ValueEncoding = 'json' | 'utf-8' | 'binary'

  namespace Hypercore {
    export type HypercoreStorage = string | ((name: string) => RandomAccessStorage) | typeof RandomAccessStorage
    export interface HypercoreGetOptions {
      wait?: boolean // wait for block to be downloaded
      onwait?(): void // hook that is called if the get is waiting for download
      timeout?: number // wait at max some milliseconds (0 means no timeout)
      valueEncoding?: ValueEncoding // defaults to the core's valueEncoding
    }
    export interface HypercoreOptions {
      createIfMissing?: boolean // create a new Hypercore key pair if none was present in storage
      overwrite?: boolean // overwrite any old Hypercore that might already exist
      valueEncoding?: ValueEncoding // defaults to binary
      encodeBatch?(batch: any[]): void // optionally apply an encoding to complete batches
      keyPair?: { publicKey: Buffer; secretKey: Buffer } // optionally pass the public key and secret key as a key pair
      encryptionKey?: Buffer // optionally pass an encryption key to enable block encryption
      sparse?: boolean // optionally disable sparse mode
    }
  }

  class Hypercore<
    TValueEncoding extends ValueEncoding = 'binary'
  > extends TypedEmitter<HypercoreEvents> {
    constructor(
      options: Hypercore.HypercoreOptions & {
        storage: Hypercore.HypercoreStorage
        valueEncoding?: TValueEncoding
      }
    )
    constructor(
      storage: Hypercore.HypercoreStorage,
      key: Buffer | string,
      options?: Hypercore.HypercoreOptions & { valueEncoding?: TValueEncoding }
    )
    constructor(
      storage: Hypercore.HypercoreStorage,
      options?: Hypercore.HypercoreOptions & { valueEncoding?: TValueEncoding }
    )
    [key: string]: any
    readonly key: Buffer
    get<TGetValueEncoding extends ValueEncoding = TValueEncoding>(
      index: number,
      options?: Hypercore.HypercoreGetOptions & { valueEncoding?: TGetValueEncoding }
    ): Promise<
      | null
      | (TGetValueEncoding extends 'binary'
          ? Buffer
          : TGetValueEncoding extends 'utf-8'
          ? string
          : TGetValueEncoding extends 'json'
          ? any
          : unknown)
    >
    replicate(
      isInitiatorOrReplicationStream: boolean | Duplex,
      opts?: { keepAlive?: boolean }
    ): Duplex
  }

  export = Hypercore
}
