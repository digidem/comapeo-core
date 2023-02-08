declare module 'corestore' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import Hypercore, { type HypercoreStorage, type HypercoreOptions } from 'hypercore'

  interface CorestoreEvents {
    'core-open'(core: Corestore): void
    'core-close'(core: Corestore): void
  }

  class Corestore extends TypedEmitter<CorestoreEvents> {
    constructor(storage: HypercoreStorage, options?: { primaryKey?: Buffer | Uint8Array })
    get(key: Buffer | Uint8Array): Hypercore
    get(options: HypercoreOptions & { name: string }): Hypercore
    get(
      options: HypercoreOptions & { key: Buffer | Uint8Array }
    ): Hypercore
    get(
      options: HypercoreOptions & {
        keyPair: { publicKey: Buffer; secretKey: Buffer }
      }
    ): Hypercore
    replicate: typeof Hypercore.prototype.replicate
    namespace(name: string): Corestore
    ready(): Promise<void>
    close(): Promise<void>
    cores: Map<string, Hypercore>
  }

  export = Corestore
}
