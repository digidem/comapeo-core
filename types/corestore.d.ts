declare module 'corestore' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import Hypercore from 'hypercore'

  interface CorestoreEvents {
    'core-open'(core: Corestore): void
    'core-close'(core: Corestore): void
  }

  class Corestore extends TypedEmitter<CorestoreEvents> {
    constructor(storage: Hypercore.HypercoreStorage)
    get(key: Buffer | Uint8Array): Hypercore
    get(options: Hypercore.HypercoreOptions & { name: string }): Hypercore
    get(options: Hypercore.HypercoreOptions & { key: Buffer | Uint8Array }): Hypercore
    replicate: typeof Hypercore.prototype.replicate
    store(name: string): Corestore
  }
  export = Corestore
}
