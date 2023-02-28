// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import Corestore from 'corestore'
import assert from 'assert'
import Hypercore from 'hypercore'
import { ProjectExtension } from './messages.js'
import { CoreIndex } from './core-index.js'
import { ReplicationStateMachine } from './replication-state-machine.js'

// WARNING: Changing these will break things for existing apps, since namespaces
// are used for key derivation
const NAMESPACES = /** @type {const} */ (['auth', 'data', 'blobIndex', 'blob'])

/** @typedef {(typeof NAMESPACES)[number]} Namespace */
/** @typedef {import('streamx').Duplex} DuplexStream */
/** @typedef {{ rsm: ReplicationStateMachine, stream: DuplexStream, cores: Set<Hypercore> }} ReplicationRecord */
/**
 * @typedef {Object} Events
 * @property {import('./core-index.js').CoreIndexEvents['add-core']} add-core
 */

/**
 * @extends {TypedEmitter<Events>}
 */
export class CoreManager extends TypedEmitter {
  #corestore
  #coreIndex
  /** @type {Hypercore} */
  #creatorCore
  #projectKey
  /** @type {Set<ReplicationRecord>} */
  #replications = new Set()
  #extension

  static get namespaces () {
    return NAMESPACES
  }

  /**
   * @param {Object} options
   * @param {import('better-sqlite3').Database} options.db better-sqlite3 database instance
   * @param {import('@mapeo/crypto').KeyManager} options.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} options.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [options.projectSecretKey] 32-byte secret key of the project creator core
   * @param {import('hypercore').HypercoreStorage} options.storage Folder to store all hypercore data
   */
  constructor ({ db, keyManager, projectKey, projectSecretKey, storage }) {
    super()
    assert(
      projectKey.length === 32,
      'project owner core public key must be 32-byte buffer'
    )
    assert(
      !projectSecretKey || projectSecretKey.length === 64,
      'project owner core secret key must be 64-byte buffer'
    )
    const primaryKey = keyManager.getDerivedKey('primaryKey', projectKey)
    this.#projectKey = projectKey

    // Note: this should not be used, because we do not rely on corestore for
    // key storage (i.e. we do not get cores from corestore via a name, which
    // would derive the keypair from the primary key), but setting this just in
    // case a dependency does (e.g. hyperdrive-next) and we miss it.
    this.#corestore = new Corestore(storage, { primaryKey })
    // Persistent index of core keys and namespaces in the project
    this.#coreIndex = new CoreIndex({ db })
    this.#coreIndex.on('add-core', core => this.emit('add-core', core))

    // Writer cores and root core, keys and namespaces are not persisted because
    // we derive the keys here.
    for (const namespace of NAMESPACES) {
      let keyPair
      if (namespace === 'auth' && projectSecretKey) {
        // For the project creator, the creatorCore is the same as the writer
        // core for the 'auth' namespace
        keyPair = { publicKey: projectKey, secretKey: projectSecretKey }
      } else {
        // Deterministic keypair, based on rootKey, namespace & projectKey
        keyPair = keyManager.getHypercoreKeypair(namespace, projectKey)
      }
      const writer = this.#addCore(keyPair, namespace)
      if (namespace === 'auth' && projectSecretKey) {
        this.#creatorCore = writer.core
      }
    }

    if (!this.#creatorCore) {
      // For anyone other than the project creator, creatorCore is readonly
      this.#creatorCore = this.addCore(projectKey, 'auth').core
    }

    this.#extension = this.#creatorCore.registerExtension('mapeo/project', {
      onmessage: (data, peer) => {
        this.#handleExtensionMessage(data, peer)
      }
    })
  }

  get creatorCore () {
    return this.#creatorCore
  }

  /**
   * Get the writer core for the given namespace
   *
   * @param {Namespace} namespace
   */
  getWriterCore (namespace) {
    return this.#coreIndex.getWriter(namespace)
  }

  /**
   * Get an array of all cores in the given namespace
   *
   * @param {Namespace} namespace
   * @returns
   */
  getCores (namespace) {
    return this.#coreIndex.getByNamespace(namespace)
  }

  /**
   * Get a core by its public key
   * @private (only used in tests)
   *
   * @param {Buffer} key
   * @returns {Hypercore | undefined}
   */
  getCoreByKey (key) {
    const coreRecord = this.#coreIndex.getByCoreKey(key)
    return coreRecord && coreRecord.core
  }

  /**
   * Add a core to the manager (will be persisted across restarts)
   *
   * @param {Buffer} key 32-byte public key of core to add
   * @param {Namespace} namespace
   * @returns {import('./core-index.js').CoreRecord}
   */
  addCore (key, namespace) {
    return this.#addCore({ publicKey: key }, namespace)
  }

  /**
   * Add a core to the manager (writer cores and project creator core not persisted)
   *
   * @param {{ publicKey: Buffer, secretKey?: Buffer }} keyPair
   * @param {Namespace} namespace
   * @returns {import('./core-index.js').CoreRecord}
   */
  #addCore (keyPair, namespace) {
    // No-op if core is already managed
    const existingCore = this.#coreIndex.getByCoreKey(keyPair.publicKey)
    if (existingCore) return existingCore

    const { publicKey: key, secretKey } = keyPair
    const writer = !!secretKey
    // Don't persist the writer cores or the creatorCore - they are derived from
    // the keyManager and the projectKey
    const persist = !writer && !key.equals(this.#projectKey)
    // @ts-ignore - TS doesn't understand checking writer ensures secretKey
    const core = this.#corestore.get(writer ? { keyPair } : key)
    this.#coreIndex.add({ core, key, namespace, writer, persist })

    // **Hack** As soon as a peer is added, eagerly send a "want" for the entire
    // core. This ensures that the peer sends back its entire bitfield.
    // Otherwise this would only happen once we call core.download()
    core.on('peer-add', peer => {
      if (core.length === 0) return
      // **Warning** uses internal method, but should be covered by tests
      peer._maybeWant(0, core.length)
    })

    // A non-writer core will emit 'append' when its length is updated from the
    // initial sync with a peer, and we will not have sent a "maybe want" for
    // this range, so we need to do it now. Subsequent appends are propogated
    // (more efficiently) via range broadcasts, so we only need to listen to the
    // first append.
    if (!writer) {
      core.once('append', () => {
        for (const peer of core.peers) {
          // TODO: It would be more efficient (in terms of network traffic) to
          // send a want with start = length of previous want. Need to track
          // "last want length" sent by peer.
          peer._maybeWant(0, core.length)
        }
      })
    }

    for (const { stream, rsm, cores } of this.#replications.values()) {
      if (cores.has(core)) continue
      if (rsm.state.enabledNamespaces.has(namespace)) {
        core.replicate(stream)
      } else {
        rsm.on('enable-namespace', function onNamespace (enabledNamespace) {
          if (enabledNamespace !== namespace) return
          if (!cores.has(core)) {
            core.replicate(stream)
          }
          rsm.off('enable-namespace', onNamespace)
        })
      }
    }

    return { core, key, namespace }
  }

  /**
   * Start replicating cores managed by CoreManager to a Noise Secret Stream (as
   * created by @hyperswarm/secret-stream). Important: only one CoreManager can
   * be replicated to a given stream - attempting to replicate a second
   * CoreManager to the same stream will cause sharing of auth core keys to
   * fail - see https://github.com/holepunchto/corestore/issues/45
   *
   * Initially only cores in the `auth` namespace are replicated to the stream.
   * All cores in the `auth` namespace are shared to all peers who have the
   * `rootCoreKey` core, and also replicated to the stream
   *
   * To start replicating other namespaces call `enableNamespace(ns)` on the
   * returned state machine
   *
   * @param {NoiseStream | ProtocolStream} noiseStream framed noise secret stream, i.e. @hyperswarm/secret-stream
   */
  replicate (noiseStream) {
    if (/** @type {ProtocolStream} */ (noiseStream).noiseStream?.userData) {
      console.warn(
        'Passed an existing protocol stream to coreManager.replicate(). Other corestores and core managers replicated to this stream will no longer automatically inject shared cores into the stream'
      )
    }
    const stream = Hypercore.createProtocolStream(noiseStream)
    const protocol = stream.noiseStream.userData
    if (!protocol) throw new Error('Invalid stream')
    // If the noise stream already had a protomux instance attached to
    // noiseStream.userData, then Hypercore.createProtocolStream does not attach
    // the ondiscoverykey listener, so we make sure we are listening for this,
    // and that we override any previous notifier that was attached to protomux.
    // This means that only one Core Manager instance can currently be
    // replicated to a stream if we want sharing of unknown auth cores to work.
    protocol.pair(
      { protocol: 'hypercore/alpha' },
      /** @param {Buffer} discoveryKey */ discoveryKey => {
        this.#handleDiscoveryKey(discoveryKey, stream)
      }
    )
    const rsm = new ReplicationStateMachine()
    /** @type {ReplicationRecord['cores']} */
    const replicatingCores = new Set()

    for (const { core } of this.getCores('auth')) {
      core.replicate(stream)
      replicatingCores.add(core)
    }

    /** @type {ReplicationRecord} */
    const replicationRecord = { stream, rsm, cores: replicatingCores }
    this.#replications.add(replicationRecord)

    rsm.on('enable-namespace', namespace => {
      for (const { core } of this.getCores(namespace)) {
        if (!replicatingCores.has(core)) {
          core.replicate(stream)
        }
      }
    })

    stream.once('close', () => {
      rsm.disableAll()
      rsm.removeAllListeners()
      this.#replications.delete(replicationRecord)
    })

    return rsm
  }

  /**
   * @param {Buffer} discoveryKey
   * @param {any} stream
   */
  async #handleDiscoveryKey (discoveryKey, stream) {
    const discoveryId = discoveryKey.toString('hex')
    const peer = await this.#findPeer(stream.remotePublicKey)
    if (!peer) {
      // TODO: How to handle this and when does it happen?
      return
    }
    // If we already know about this core, then we will add it to the
    // replication stream when we are ready
    if (this.#coreIndex.getByDiscoveryId(discoveryId)) return
    const message = ProjectExtension.encode({
      wantCoreKeys: [discoveryKey],
      authCoreKeys: []
    }).finish()
    this.#extension.send(message, peer)
  }

  /**
   * @param {Buffer} publicKey
   */
  async #findPeer (publicKey) {
    await this.#creatorCore.ready()
    return this.#creatorCore.peers.find(peer =>
      peer.remotePublicKey.equals(publicKey)
    )
  }

  /**
   * @param {Buffer} data
   * @param {any} peer
   */
  #handleExtensionMessage (data, peer) {
    const { wantCoreKeys, authCoreKeys } = ProjectExtension.decode(data)
    for (const discoveryKey of wantCoreKeys) {
      const discoveryId = discoveryKey.toString('hex')
      const coreRecord = this.#coreIndex.getByDiscoveryId(discoveryId)
      if (!coreRecord) continue
      if (coreRecord.namespace === 'auth') {
        const message = ProjectExtension.encode({
          authCoreKeys: [coreRecord.key],
          wantCoreKeys: []
        }).finish()
        this.#extension.send(message, peer)
      }
    }
    for (const authCoreKey of authCoreKeys) {
      this.addCore(authCoreKey, 'auth')
    }
  }
}
