// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import Corestore from 'corestore'
import assert from 'node:assert'
import { once } from 'node:events'
import Hypercore from 'hypercore'
import { HaveExtension, ProjectExtension } from '../generated/extensions.js'
import { CoreIndex } from './core-index.js'
import { ReplicationStateMachine } from './replication-state-machine.js'
import * as rle from './bitfield-rle.js'

// WARNING: Changing these will break things for existing apps, since namespaces
// are used for key derivation
export const NAMESPACES = /** @type {const} */ ([
  'auth',
  'config',
  'data',
  'blobIndex',
  'blob',
])
// WARNING: If changed once in production then we need a migration strategy
const TABLE = 'cores'
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  publicKey BLOB NOT NULL,
  namespace TEXT NOT NULL
)`

/** @typedef {import('hypercore')<'binary', Buffer>} Core */
/** @typedef {(typeof NAMESPACES)[number]} Namespace */
/** @typedef {{ core: Core, key: Buffer, namespace: Namespace }} CoreRecord */
/** @typedef {import('streamx').Duplex} DuplexStream */
/** @typedef {{ rsm: ReplicationStateMachine, stream: DuplexStream, cores: Set<Core> }} ReplicationRecord */
/**
 * @typedef {Object} Events
 * @property {(coreRecord: CoreRecord) => void} add-core
 * @property {(namespace: Namespace, msg: { coreDiscoveryId: string, peerId: string, start: number, bitfield: Uint32Array }) => void} peer-have
 */

/**
 * @extends {TypedEmitter<Events>}
 */
export class CoreManager extends TypedEmitter {
  #corestore
  #coreIndex
  /** @type {Core} */
  #creatorCore
  #projectKey
  #addCoreSqlStmt
  #encryptionKeys
  /** @type {Set<ReplicationRecord>} */
  #replications = new Set()
  #projectExtension
  /** @type {'opened' | 'closing' | 'closed'} */
  #state = 'opened'
  #ready
  #haveExtension

  static get namespaces() {
    return NAMESPACES
  }

  /**
   * @param {Object} options
   * @param {import('better-sqlite3').Database} options.sqlite better-sqlite3 database instance
   * @param {import('@mapeo/crypto').KeyManager} options.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} options.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [options.projectSecretKey] 32-byte secret key of the project creator core
   * @param {Partial<Record<Namespace, Buffer>>} [options.encryptionKeys] Encryption keys for each namespace
   * @param {import('hypercore').HypercoreStorage} options.storage Folder to store all hypercore data
   */
  constructor({
    sqlite,
    keyManager,
    projectKey,
    projectSecretKey,
    encryptionKeys = {},
    storage,
  }) {
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
    this.#encryptionKeys = encryptionKeys

    // Make sure table exists for persisting known cores
    sqlite.prepare(CREATE_SQL).run()
    // Pre-prepare SQL statement for better performance
    this.#addCoreSqlStmt = sqlite.prepare(
      `INSERT OR IGNORE INTO ${TABLE} VALUES (@publicKey, @namespace)`
    )

    // Note: the primary key here should not be used, because we do not rely on
    // corestore for key storage (i.e. we do not get cores from corestore via a
    // name, which would derive the keypair from the primary key), but setting
    // this just in case a dependency does (e.g. hyperdrive) and we miss it.
    this.#corestore = new Corestore(storage, { primaryKey })
    // Persistent index of core keys and namespaces in the project
    this.#coreIndex = new CoreIndex()

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
      this.#creatorCore = this.#addCore({ publicKey: projectKey }, 'auth').core
    }

    // Load persisted cores
    const stmt = sqlite.prepare(`SELECT publicKey, namespace FROM ${TABLE}`)
    // @ts-ignore - don't know types returned from sqlite here
    for (const { publicKey, namespace } of stmt.all()) {
      this.#addCore({ publicKey }, namespace)
    }

    this.#projectExtension = this.#creatorCore.registerExtension(
      'mapeo/project',
      {
        encoding: ProjectExtensionCodec,
        onmessage: (msg, peer) => {
          this.#handleProjectMessage(msg, peer)
        },
      }
    )

    this.#haveExtension = this.#creatorCore.registerExtension('mapeo/have', {
      encoding: HaveExtensionCodec,
      onmessage: (msg, peer) => {
        this.#handleHaveMessage(msg, peer)
      },
    })

    this.#creatorCore.on('peer-add', (peer) => {
      this.#sendHaves(peer)
    })

    this.#ready = Promise.all(
      [...this.#coreIndex].map(({ core }) => core.ready())
    ).catch(() => {})
  }

  get creatorCore() {
    return this.#creatorCore
  }

  /**
   * Resolves when all cores have finished loading
   *
   * @returns {Promise<void>}
   */
  async ready() {
    await this.#ready
  }

  /**
   * Get the writer core for the given namespace
   *
   * @param {Namespace} namespace
   */
  getWriterCore(namespace) {
    return this.#coreIndex.getWriter(namespace)
  }

  /**
   * Get an array of all cores in the given namespace
   *
   * @param {Namespace} namespace
   * @returns
   */
  getCores(namespace) {
    return this.#coreIndex.getByNamespace(namespace)
  }

  /**
   * Get a core by its public key
   *
   * @param {Buffer} key
   * @returns {Core | undefined}
   */
  getCoreByKey(key) {
    const coreRecord = this.#coreIndex.getByCoreKey(key)
    return coreRecord && coreRecord.core
  }

  /**
   * Get a core by its discovery key
   *
   * @param {Buffer} discoveryKey
   * @returns {Core | undefined}
   */
  getCoreByDiscoveryKey(discoveryKey) {
    const coreRecord = this.#coreIndex.getByDiscoveryId(
      discoveryKey.toString('hex')
    )
    return coreRecord && coreRecord.core
  }

  /**
   * Close all open cores and end any replication streams
   * TODO: gracefully close replication streams
   */
  async close() {
    this.#state = 'closing'
    const promises = []
    for (const { core } of this.#coreIndex) {
      promises.push(core.close())
    }
    for (const { stream } of this.#replications) {
      promises.push(once(stream, 'close'))
      stream.destroy()
    }
    await Promise.all(promises)
    this.#state = 'closed'
  }

  /**
   * Add a core to the manager (will be persisted across restarts)
   *
   * @param {Buffer} key 32-byte public key of core to add
   * @param {Namespace} namespace
   * @returns {import('./core-index.js').CoreRecord}
   */
  addCore(key, namespace) {
    return this.#addCore({ publicKey: key }, namespace, true)
  }

  /**
   * Add a core to the manager (writer cores and project creator core not persisted)
   *
   * @param {{ publicKey: Buffer, secretKey?: Buffer }} keyPair
   * @param {Namespace} namespace
   * @param {boolean} [persist=false]
   * @returns {import('./core-index.js').CoreRecord}
   */
  #addCore(keyPair, namespace, persist = false) {
    // No-op if core is already managed
    const existingCore = this.#coreIndex.getByCoreKey(keyPair.publicKey)
    if (existingCore) return existingCore

    const { publicKey: key, secretKey } = keyPair
    const writer = !!secretKey
    const core = this.#corestore.get({
      keyPair,
      encryptionKey: this.#encryptionKeys[namespace],
    })
    // @ts-ignore - ensure key is defined before hypercore is ready
    core.key = key
    this.#coreIndex.add({ core, key, namespace, writer })

    // **Hack** As soon as a peer is added, eagerly send a "want" for the entire
    // core. This ensures that the peer sends back its entire bitfield.
    // Otherwise this would only happen once we call core.download()
    core.on('peer-add', (peer) => {
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
      }
    }

    if (persist) {
      this.#addCoreSqlStmt.run({ publicKey: key, namespace })
    }

    this.emit('add-core', { core, key, namespace })

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
   * @param {import('../types.js').NoiseStream | import('../types.js').ProtocolStream} noiseStream framed noise secret stream, i.e. @hyperswarm/secret-stream
   */
  replicate(noiseStream) {
    if (this.#state !== 'opened') throw new Error('Core manager is closed')
    if (
      /** @type {import('../types.js').ProtocolStream} */ (noiseStream)
        .noiseStream?.userData
    ) {
      console.warn(
        'Passed an existing protocol stream to coreManager.replicate(). Other corestores and core managers replicated to this stream will no longer automatically inject shared cores into the stream'
      )
    }
    // @ts-expect-error - too complex to type right now
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
      /** @param {Buffer} discoveryKey */ async (discoveryKey) => {
        this.handleDiscoveryKey(discoveryKey, stream)
      }
    )

    /** @type {ReplicationRecord['cores']} */
    const replicatingCores = new Set()
    const rsm = new ReplicationStateMachine({
      enableNamespace: (namespace) => {
        for (const { core } of this.getCores(namespace)) {
          if (replicatingCores.has(core)) continue
          core.replicate(protocol)
          replicatingCores.add(core)
        }
      },
      disableNamespace: (namespace) => {
        for (const { core } of this.getCores(namespace)) {
          if (core === this.creatorCore) continue
          unreplicate(core, protocol)
          replicatingCores.delete(core)
        }
      },
    })

    // Always need to replicate the project creator core
    this.creatorCore.replicate(protocol)
    replicatingCores.add(this.creatorCore)

    // For now enable auth namespace here, rather than in sync controller
    rsm.enableNamespace('auth')

    /** @type {ReplicationRecord} */
    const replicationRecord = { stream, rsm, cores: replicatingCores }
    this.#replications.add(replicationRecord)

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
  async handleDiscoveryKey(discoveryKey, stream) {
    const discoveryId = discoveryKey.toString('hex')
    const peer = await this.#findPeer(stream.remotePublicKey)
    if (!peer) {
      console.warn('handleDiscovery no peer', stream.remotePublicKey)
      // TODO: How to handle this and when does it happen?
      return
    }
    // If we already know about this core, then we will add it to the
    // replication stream when we are ready
    if (this.#coreIndex.getByDiscoveryId(discoveryId)) return
    const message = ProjectExtension.fromPartial({
      wantCoreKeys: [discoveryKey],
    })
    this.#projectExtension.send(message, peer)
  }

  /**
   * @param {Buffer} publicKey
   * @param {{ timeout?: number }} [opts]
   */
  async #findPeer(publicKey, { timeout = 200 } = {}) {
    const creatorCore = this.#creatorCore
    const peer = creatorCore.peers.find((peer) => {
      return peer.remotePublicKey.equals(publicKey)
    })
    if (peer) return peer
    // This is called from the from the handleDiscoveryId event, which can
    // happen before the peer connection is fully established, so we wait for
    // the `peer-add` event, with a timeout in case the peer never gets added
    return new Promise(function (res) {
      const timeoutId = setTimeout(function () {
        creatorCore.off('peer-add', onPeer)
        res(null)
      }, timeout)

      creatorCore.on('peer-add', onPeer)

      /** @param {any} peer */
      function onPeer(peer) {
        if (peer.remotePublicKey.equals(publicKey)) {
          clearTimeout(timeoutId)
          creatorCore.off('peer-add', onPeer)
          res(peer)
        }
      }
    })
  }

  /**
   * @param {ProjectExtension} msg
   * @param {any} peer
   */
  #handleProjectMessage({ wantCoreKeys, ...coreKeys }, peer) {
    const message = ProjectExtension.create()
    let hasKeys = false
    for (const discoveryKey of wantCoreKeys) {
      const discoveryId = discoveryKey.toString('hex')
      const coreRecord = this.#coreIndex.getByDiscoveryId(discoveryId)
      if (!coreRecord) continue
      message[`${coreRecord.namespace}CoreKeys`].push(coreRecord.key)
      hasKeys = true
    }
    if (hasKeys) {
      this.#projectExtension.send(message, peer)
    }
    for (const namespace of NAMESPACES) {
      for (const coreKey of coreKeys[`${namespace}CoreKeys`]) {
        // Use public method - these must be persisted (private method defaults to persisted=false)
        this.addCore(coreKey, namespace)
      }
    }
  }

  /**
   * @param {Omit<HaveMsg, 'namespace'> & { namespace: Namespace | 'UNRECOGNIZED' }} msg
   * @param {any} peer
   */
  #handleHaveMessage(msg, peer) {
    const { start, discoveryKey, bitfield, namespace } = msg
    if (namespace === 'UNRECOGNIZED') return
    /** @type {string} */
    const peerId = peer.remotePublicKey.toString('hex')
    const coreDiscoveryId = discoveryKey.toString('hex')
    this.emit('peer-have', namespace, {
      coreDiscoveryId,
      peerId,
      start,
      bitfield,
    })
  }

  /**
   *
   * @param {any} peer
   */
  async #sendHaves(peer) {
    if (!peer) {
      console.warn('sendHaves no peer', peer.remotePublicKey)
      // TODO: How to handle this and when does it happen?
      return
    }

    peer.protomux.cork()

    for (const { core, namespace } of this.#coreIndex) {
      // We want ready() rather than update() because we are only interested in local data
      await core.ready()
      if (core.length === 0) continue
      const { discoveryKey } = core
      // This will always be defined after ready(), but need to let TS know
      if (!discoveryKey) continue
      /** @type {Iterable<{ start: number, bitfield: Uint32Array }>} */
      // @ts-ignore - accessing internal property
      const bitfieldIterator = core.core.bitfield.want(0, core.length)
      for (const { start, bitfield } of bitfieldIterator) {
        const message = { start, bitfield, discoveryKey, namespace }
        this.#haveExtension.send(message, peer)
      }
    }

    peer.protomux.uncork()
  }
}

/**
 * @typedef {object} HaveMsg
 * @property {Buffer} discoveryKey
 * @property {number} start
 * @property {Uint32Array} bitfield
 * @property {Namespace} namespace
 */

const ProjectExtensionCodec = {
  /** @param {Parameters<typeof ProjectExtension.encode>[0]} msg */
  encode(msg) {
    return ProjectExtension.encode(msg).finish()
  },
  /** @param {Buffer | Uint8Array} buf */
  decode(buf) {
    return ProjectExtension.decode(buf)
  },
}

const HaveExtensionCodec = {
  /** @param {HaveMsg} msg */
  encode({ start, discoveryKey, bitfield, namespace }) {
    const encodedBitfield = rle.encode(bitfield)
    const msg = { start, discoveryKey, encodedBitfield, namespace }
    return HaveExtension.encode(msg).finish()
  },
  /**
   * @param {Buffer | Uint8Array} buf
   * @returns {Omit<HaveMsg, 'namespace'> & { namespace: HaveMsg['namespace'] | 'UNRECOGNIZED' }}
   */
  decode(buf) {
    const { start, discoveryKey, encodedBitfield, namespace } =
      HaveExtension.decode(buf)
    try {
      const bitfield = rle.decode(encodedBitfield)
      return { start, discoveryKey, bitfield, namespace }
    } catch (e) {
      // TODO: Log error
      console.error(e)
      return { start, discoveryKey, bitfield: new Uint32Array(), namespace }
    }
  },
}

/**
 *
 * @param {Hypercore<'binary', any>} core
 * @param {import('protomux')} protomux
 */
export function unreplicate(core, protomux) {
  const peerToUnreplicate = core.peers.find(
    (peer) => peer.protomux === protomux
  )
  if (!peerToUnreplicate) return
  peerToUnreplicate.channel.close()
  return
}
