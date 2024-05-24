declare module 'corestore' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import Hypercore, {
    type HypercoreStorage,
    type HypercoreOptions,
    type ReplicationStream,
    type CreateProtocolStreamOpts,
  } from 'hypercore'
  import { SetRequired } from 'type-fest'

  interface CorestoreEvents {
    'core-open'(core: Corestore): void
    'core-close'(core: Corestore): void
  }

  class Corestore extends TypedEmitter<CorestoreEvents> {
    constructor(
      storage: HypercoreStorage,
      options?: { primaryKey?: Buffer | Uint8Array; poolSize?: number }
    )
    get(key: Buffer | Uint8Array): Hypercore<Hypercore.ValueEncoding, Buffer>
    get(
      options: Omit<HypercoreOptions, 'keyPair'> & { name: string }
    ): Hypercore<Hypercore.ValueEncoding, Buffer>
    get(
      options: Omit<HypercoreOptions, 'keyPair'> & { key: Buffer | Uint8Array }
    ): Hypercore<Hypercore.ValueEncoding, Buffer>
    get(
      options: Omit<HypercoreOptions, 'keyPair' | 'key'> & {
        key?: Buffer | string | undefined
        keyPair: { publicKey: Buffer; secretKey?: Buffer | undefined | null }
        sparse?: boolean
      }
    ): Hypercore<Hypercore.ValueEncoding, Buffer>
    replicate(
      stream:
        | boolean
        | Duplex
        | NodeDuplex
        | NoiseStream
        | ProtocolStream
        | Protomux,
      opts?: CreateProtocolStreamOpts
    ): ReplicationStream
    namespace(name: string): Corestore
    ready(): Promise<void>
    close(): Promise<void>
    cores: Map<string, Hypercore<Hypercore.ValueEncoding, Buffer>>
  }

  export = Corestore
}
