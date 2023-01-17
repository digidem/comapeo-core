import { TypedEmitter } from 'tiny-typed-emitter'

/** @typedef {import('./index.js').Namespace} Namespace */
/** @typedef {Set<Namespace>} EnabledNamespaces */
/** @typedef {{ enabledNamespaces: EnabledNamespaces }} ReplicationState */

/**
 * @typedef {object} StateMachineEvents
 * @property {(state: ReplicationState) => void } state
 * @property {(namespace: Namespace) => void} enable-namespace Fired whenever a namespace is enabled for replication
 */

/**
 * A simple state machine to manage which namespaces are enabled for replication
 *
 * @extends {TypedEmitter<StateMachineEvents>}
 */
export class ReplicationStateMachine extends TypedEmitter {
  /** @type {ReplicationState} */
  #state = {
    enabledNamespaces: new Set(['auth'])
  }

  get state () {
    return this.#state
  }

  /**
   * Enable a namespace for replication - will add known cores in the namespace
   * to the replication stream
   *
   * @param {Namespace} namespace */
  enableNamespace (namespace) {
    if (this.#state.enabledNamespaces.has(namespace)) return
    this.#state.enabledNamespaces.add(namespace)
    this.emit('enable-namespace', namespace)
    this.emit('state', this.#state)
  }

  // No obvious way to implement this
  // /** @param {Namespace} namespace */
  // disableNamespace (namespace) {
  //   if (!this.#state.enabledNamespaces.has(namespace)) return
  //   this.#state.enabledNamespaces.delete(namespace)
  //   this.emit('disable-namespace', namespace)
  //   this.emit('state', this.#state)
  // }

  /**
   * @internal
   * Should only be called when the stream is closed, because no obvious way to
   * implement this otherwise.
   */
  disableAll () {
    if (!this.#state.enabledNamespaces.size) return
    this.#state.enabledNamespaces.clear()
    this.emit('state', this.#state)
  }
}
