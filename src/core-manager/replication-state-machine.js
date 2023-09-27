import { TypedEmitter } from 'tiny-typed-emitter'

/** @typedef {import('./index.js').Namespace} Namespace */
/** @typedef {Set<Namespace>} EnabledNamespaces */
/** @typedef {{ enabledNamespaces: EnabledNamespaces }} ReplicationState */

/**
 * @typedef {object} StateMachineEvents
 * @property {(state: ReplicationState) => void } state
 */

/**
 * A simple state machine to manage which namespaces are enabled for replication
 *
 * @extends {TypedEmitter<StateMachineEvents>}
 */
export class ReplicationStateMachine extends TypedEmitter {
  /** @type {ReplicationState} */
  #state = {
    enabledNamespaces: new Set(['auth']),
  }
  #enableNamespace
  #disableNamespace

  /**
   *
   * @param {object} opts
   * @param {(namespace: Namespace) => void} opts.enableNamespace
   * @param {(namespace: Namespace) => void} opts.disableNamespace
   */
  constructor({ enableNamespace, disableNamespace }) {
    super()
    this.#enableNamespace = enableNamespace
    this.#disableNamespace = disableNamespace
  }

  get state() {
    return this.#state
  }

  /**
   * Enable a namespace for replication - will add known cores in the namespace
   * to the replication stream
   *
   * @param {Namespace} namespace */
  enableNamespace(namespace) {
    if (this.#state.enabledNamespaces.has(namespace)) return
    this.#state.enabledNamespaces.add(namespace)
    this.#enableNamespace(namespace)
    this.emit('state', this.#state)
  }

  /**
   * Disable a namespace for replication - will remove cores in the namespace
   * from  the replication stream
   *
   * @param {Namespace} namespace
   */
  disableNamespace(namespace) {
    if (!this.#state.enabledNamespaces.has(namespace)) return
    this.#state.enabledNamespaces.delete(namespace)
    this.#disableNamespace(namespace)
    this.emit('state', this.#state)
  }

  /**
   * @internal
   * Should only be called when the stream is closed, because no obvious way to
   * implement this otherwise.
   */
  disableAll() {
    if (!this.#state.enabledNamespaces.size) return
    this.#state.enabledNamespaces.clear()
    this.emit('state', this.#state)
  }
}
