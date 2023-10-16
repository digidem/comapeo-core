export class PeerSyncController {
  #replicatingCores = new Set()
  /** @type {Set<import("../core-manager/index.js").Namespace>} */
  #enabledNamespaces = new Set()
  #coreManager
  #protomux

  /**
   * @param {object} opts
   * @param {import("protomux")} opts.protomux
   * @param {import("../core-manager/index.js").CoreManager} opts.coreManager
   */
  constructor({ protomux, coreManager }) {
    this.#coreManager = coreManager
    this.#protomux = protomux

    // Always need to replicate the project creator core
    coreManager.creatorCore.replicate(protomux)
    this.#replicatingCores.add(coreManager.creatorCore)

    coreManager.on('add-core', this.#handleAddCore)
  }

  /**
   * Bound to `this` (defined as static property)
   *
   * @param {import("../core-manager/core-index.js").CoreRecord} coreRecord
   */
  #handleAddCore = ({ core, namespace }) => {
    if (!this.#enabledNamespaces.has(namespace)) return
    this.#replicateCore(core)
  }

  /**
   * @param {import('hypercore')<'binary', any>} core
   */
  #replicateCore(core) {
    if (this.#replicatingCores.has(core)) return
    core.replicate(this.#protomux)
    this.#replicatingCores.add(core)
  }

  /**
   * @param {import('hypercore')<'binary', any>} core
   */
  #unreplicateCore(core) {
    if (core === this.#coreManager.creatorCore) return
    const peerToUnreplicate = core.peers.find(
      (peer) => peer.protomux === this.#protomux
    )
    if (!peerToUnreplicate) return
    peerToUnreplicate.channel.close()
    this.#replicatingCores.delete(core)
  }

  /**
   * @param {import("../core-manager/index.js").Namespace} namespace
   */
  enableNamespace(namespace) {
    for (const { core } of this.#coreManager.getCores(namespace)) {
      this.#replicateCore(core)
    }
    this.#enabledNamespaces.add(namespace)
  }

  /**
   * @param {import("../core-manager/index.js").Namespace} namespace
   */
  disableNamespace(namespace) {
    for (const { core } of this.#coreManager.getCores(namespace)) {
      this.#unreplicateCore(core)
    }
    this.#enabledNamespaces.delete(namespace)
  }
}
