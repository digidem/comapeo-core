import Hypercore from 'hypercore'
import { TypedEmitter } from 'tiny-typed-emitter'
import Protomux from 'protomux'
import { SyncState } from './sync-state.js'
import { PeerSyncController } from './peer-sync-controller.js'

export class SyncController extends TypedEmitter {
  #syncState
  #coreManager
  #capabilities
  /** @type {Map<Protomux, PeerSyncController>} */
  #peerSyncControllers = new Map()

  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import("../capabilities.js").Capabilities} opts.capabilities
   * @param {number} [opts.throttleMs]
   */
  constructor({ coreManager, throttleMs = 200, capabilities }) {
    super()
    this.#coreManager = coreManager
    this.#capabilities = capabilities
    this.#syncState = new SyncState({ coreManager, throttleMs })
  }

  getState() {
    return this.#syncState.getState()
  }

  /**
   * @param {Exclude<Parameters<Hypercore.createProtocolStream>[0], boolean>} stream A duplex stream, a @hyperswarm/secret-stream, or a Protomux instance
   */
  replicate(stream) {
    if (
      Protomux.isProtomux(stream) ||
      ('userData' in stream && Protomux.isProtomux(stream.userData)) ||
      ('noiseStream' in stream &&
        Protomux.isProtomux(stream.noiseStream.userData))
    ) {
      console.warn(
        'Passed an existing protocol stream to syncController.replicate(). Currently any pairing for the `hypercore/alpha` protocol is overwritten'
      )
    }
    const protocolStream = Hypercore.createProtocolStream(stream, {
      ondiscoverykey: /** @param {Buffer} discoveryKey */ (discoveryKey) => {
        return this.#coreManager.handleDiscoveryKey(discoveryKey, stream)
      },
    })
    const protomux =
      // Need to coerce this until we update Hypercore.createProtocolStream types
      /** @type {import('protomux')<import('@hyperswarm/secret-stream')>} */ (
        protocolStream.noiseStream.userData
      )
    if (!protomux) throw new Error('Invalid stream')

    if (this.#peerSyncControllers.has(protomux)) {
      console.warn('Already replicating to this stream')
      return
    }

    const peerSyncController = new PeerSyncController({
      protomux,
      coreManager: this.#coreManager,
      syncState: this.#syncState,
      capabilities: this.#capabilities,
    })
    this.#peerSyncControllers.set(protomux, peerSyncController)
  }
}
