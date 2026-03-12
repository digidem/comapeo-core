declare module 'ready-resource' {
  import { TypedEmitter } from 'tiny-typed-emitter'

  export default class ReadyResource<EventMap> extends TypedEmitter<EventMap> {
    /**
     * Resolves when this resource is initialized.
     */
    async ready(): Promise<void>
    /**
     * Resolves when this resource has closed any dependencies.
     */
    async close(): Promise<void>

    /**
     * Load any async resources here
     */
    _open(): Promise<void> | void

    /**
     * Unload any async resources here
     */
    _close(): Promise<void> | void
  }
}
