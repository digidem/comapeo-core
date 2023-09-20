// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { projectKeyToId, projectKeyToPublicId } from './utils.js'

/**
 * @typedef {Object} InviteApiEvents
 *
 * @property {(info: { projectId: string, projectName?: string }) => void} invite-received
 */

/**
 * @extends {TypedEmitter<InviteApiEvents>}
 */
export class InviteApi extends TypedEmitter {
  // Maps project id -> set of device ids
  /** @type {Map<string, Set<string>>} */
  #peersToRespondTo = new Map()

  // Maps project id -> invite
  /** @type {Map<string, import('./generated/rpc.js').Invite>} */
  #invites = new Map()

  #isMember
  #addProject

  /**
   * @param {Object} options
   * @param {import('./rpc/index.js').MapeoRPC} options.rpc
   * @param {object} options.queries
   * @param {(projectId: string) => Promise<boolean>} options.queries.isMember
   * @param {(invite: import('./generated/rpc.js').Invite) => Promise<void>} options.queries.addProject
   */
  constructor({ rpc, queries }) {
    super()
    this.rpc = rpc
    this.#isMember = queries.isMember
    this.#addProject = queries.addProject

    this.rpc.on('invite', async (peerId, invite) => {
      const projectId = projectKeyToId(invite.projectKey)

      const peerIds = this.#peersToRespondTo.get(projectId) || new Set()
      peerIds.add(peerId)
      this.#peersToRespondTo.set(projectId, peerIds)

      const isAlreadyMember = await this.#isMember(projectId)

      if (isAlreadyMember) {
        // TODO: Catch the error and no-op here?
        this.#respond({ projectId, decision: InviteResponse_Decision.ALREADY })
      } else {
        this.#invites.set(projectId, invite)

        if (peerIds.size === 1) {
          this.emit('invite-received', {
            // TODO: Should this be the project public ID since it can be exposed to the client?
            // Probably would require changing the public methods to accept the public ID
            // and using the public ID for #invites and #peersToRespondTo keys instead
            projectId,
            projectName: invite.projectInfo?.name,
          })
        }
      }
    })
  }

  /**
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async accept(projectId) {
    const isAlreadyMember = await this.#isMember(projectId)

    // TODO: Is this check necessary?
    // If so, do we want to respond here or throw an error?
    if (isAlreadyMember) {
      return this.#respond({
        projectId,
        decision: InviteResponse_Decision.ALREADY,
      })
    }

    return this.#respond({
      projectId,
      decision: InviteResponse_Decision.ACCEPT,
    })
  }

  /**
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async reject(projectId) {
    return this.#respond({
      projectId,
      decision: InviteResponse_Decision.REJECT,
    })
  }

  /**
   * @param {Object} options
   * @param {string} options.projectId
   * @param {InviteResponse_Decision} options.decision
   */
  async #respond({ projectId, decision }) {
    const projectKey = Buffer.from(projectId, 'hex')

    switch (decision) {
      case InviteResponse_Decision.ACCEPT: {
        const invite = this.#invites.get(projectId)

        if (!invite) {
          throw new Error(
            `Cannot find invite for project with ID ${projectKeyToPublicId(
              projectKey
            )}`
          )
        }

        // TODO: What should we do if this throws?
        await this.#addProject(invite)

        const connectedPeers = this.#getConnectedProjectPeers(projectId)

        // TODO: Is this what we want to do here?
        if (connectedPeers.size === 0) {
          throw new Error('No connected peers to respond to')
        }

        const [firstPeerId, ...remainingPeerIds] = Array.from(connectedPeers)

        this.rpc.inviteResponse(firstPeerId, {
          projectKey,
          decision: InviteResponse_Decision.ACCEPT,
        })

        // Respond to the remaining peers with ALREADY
        for (const peerId of remainingPeerIds) {
          this.rpc.inviteResponse(peerId, {
            projectKey,
            decision: InviteResponse_Decision.ALREADY,
          })
        }
      }
      case InviteResponse_Decision.REJECT: {
        const connectedPeers = this.#getConnectedProjectPeers(projectId)

        // TODO: Is this what we want to do here?
        if (connectedPeers.size === 0) {
          throw new Error('No connected peers to respond to')
        }

        for (const peerId of connectedPeers) {
          this.rpc.inviteResponse(peerId, {
            projectKey,
            decision: InviteResponse_Decision.REJECT,
          })
        }
      }
      case InviteResponse_Decision.ALREADY: {
        const connectedPeers = this.#getConnectedProjectPeers(projectId)

        // TODO: Is this what we want to do here?
        if (connectedPeers.size === 0) {
          throw new Error('No connected peers to respond to')
        }

        for (const peerId of connectedPeers) {
          this.rpc.inviteResponse(peerId, {
            projectKey,
            decision: InviteResponse_Decision.ALREADY,
          })
        }
      }
    }

    this.#peersToRespondTo.delete(projectId)
    this.#invites.delete(projectId)
  }

  /**
   * @param {string} peerId
   * @returns {boolean}
   */
  #isPeerConnected(peerId) {
    return this.rpc.peers.some((peer) => peer.id === peerId)
  }

  /**
   * @param {string} projectId
   * @returns {Set<string>} peerIds
   */
  #getProjectPeerIds(projectId) {
    return this.#peersToRespondTo.get(projectId) || new Set()
  }

  /**
   *
   * @param {string} projectId
   * @returns {Set<string>}
   */
  #getConnectedProjectPeers(projectId) {
    const connected = new Set()
    const projectPeerIds = this.#getProjectPeerIds(projectId)

    for (const id of projectPeerIds) {
      if (this.#isPeerConnected(id)) {
        connected.add(id)
      }
    }

    return connected
  }
}
