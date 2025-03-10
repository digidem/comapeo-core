import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from '../generated/rpc.js'
import { assert, keyToId, noop } from '../utils.js'
import HashMap from '../lib/hashmap.js'
import timingSafeEqual from 'string-timing-safe-equal'
import { Logger } from '../logger.js'
import { createActor, fromPromise, toPromise } from 'xstate'
import { inviteStateMachine } from './invite-state-machine.js'
import { NotFoundError } from '../errors.js'

/** @import { MapBuffers } from '../types.js' */
/**
 * @import {
 *   Invite as InviteRpcMessage,
 *   InviteCancel,
 *   ProjectJoinDetails
 * } from '../generated/rpc.js'
 */

// There are three slightly different invite types:
//
// - InviteRpcMessage comes from the protobuf.
// - InviteInternal adds a locally-generated receive timestamp.
// - Invite is the externally-facing type.

/**
 * @internal
 * @typedef {InviteRpcMessage & { receivedAt: number }} InviteInternal
 */
/** @typedef {ExtractStateString<import('xstate').StateValueFrom<typeof inviteStateMachine>>} InviteState */
/** @typedef {import('type-fest').Simplify<MapBuffers<InviteInternal> & { state: InviteState, invitorDeviceId: string }>} Invite */

/**
 * @typedef {import('xstate').ActorRefFrom<typeof inviteStateMachine>} invite.actor
 */

/**
 * @typedef {Object} InviteApiEvents
 * @property {(invite: Invite) => void} invite-received
 * @property {(invite: Invite) => void} invite-updated
 */

/**
 * @typedef {(projectDetails: Pick<ProjectJoinDetails, 'projectKey' | 'encryptionKeys'> & { projectName: string }) => Promise<string>} AddProjectQuery
 */

/**
 * @extends {TypedEmitter<InviteApiEvents>}
 */
export class InviteApi extends TypedEmitter {
  #getProjectByInviteId
  #addProject
  /** @type {HashMap<string | Buffer, { value: InviteInternal, actor: invite.actor, peerId: string }>} */
  #invites = new HashMap(keyToId)
  #l

  /**
   * @param {Object} options
   * @param {import('../local-peers.js').LocalPeers} options.rpc
   * @param {object} options.queries
   * @param {(projectInviteId: Readonly<Buffer>) => undefined | { projectPublicId: string }} options.queries.getProjectByInviteId
   * @param {AddProjectQuery} options.queries.addProject
   * @param {Logger} [options.logger]
   */
  constructor({ rpc, queries, logger }) {
    super()

    this.#l = Logger.create('InviteApi', logger)

    this.rpc = rpc
    this.#getProjectByInviteId = queries.getProjectByInviteId
    this.#addProject = queries.addProject

    this.rpc.on('invite', (...args) => {
      try {
        this.#handleNewInvite(...args)
      } catch (err) {
        console.error('Error handling invite', err)
      }
    })

    this.rpc.on('invite-cancel', (_peerId, inviteCancel) => {
      try {
        this.#handleInviteCancel(inviteCancel)
      } catch (err) {
        console.error('Error handling invite cancel', err)
      }
    })

    this.rpc.on('got-project-details', (peerId, projectJoinDetails) => {
      try {
        this.#handleGotProjectDetails(peerId, projectJoinDetails)
      } catch (err) {
        console.error('Error handling got-project-details', err)
      }
    })
  }

  /** @param {Buffer} projectInviteId */
  #isJoiningProject(projectInviteId) {
    for (const { value, actor } of this.#invites.values()) {
      const state = actor.getSnapshot()
      if (
        state.matches('joining') &&
        value.projectInviteId.equals(projectInviteId)
      ) {
        return true
      }
    }
    return false
  }

  /**
   * @param {string} peerId
   * @param {InviteRpcMessage} inviteRpcMessage
   */
  #handleNewInvite(peerId, inviteRpcMessage) {
    const { inviteId, projectInviteId, projectName } = inviteRpcMessage
    const invite = { ...inviteRpcMessage, receivedAt: Date.now() }

    this.#l.log('Received invite %h from %S', inviteId, peerId)

    const hasAlreadyReceivedThisInvite = this.#invites.has(inviteId)
    if (hasAlreadyReceivedThisInvite) {
      this.#l.log('Invite %h: already received this invite', inviteId)
      return
    }

    const isAlreadyMember = Boolean(this.#getProjectByInviteId(projectInviteId))
    if (isAlreadyMember) {
      this.#l.log('Invite %h: already in project', inviteId)
      this.rpc
        .sendInviteResponse(peerId, {
          decision: InviteResponse_Decision.ALREADY,
          inviteId,
        })
        .catch(noop)
      return
    }

    const actor = createActor(
      inviteStateMachine.provide({
        actions: {
          doAcceptInvite: () => {
            this.rpc.sendInviteResponse(peerId, {
              decision: InviteResponse_Decision.ACCEPT,
              inviteId,
            })
          },
          doRejectInvite: () => {
            this.rpc.sendInviteResponse(peerId, {
              decision: InviteResponse_Decision.REJECT,
              inviteId,
            })
          },
          doRespondAlready: () => {
            this.rpc.sendInviteResponse(peerId, {
              decision: InviteResponse_Decision.ALREADY,
              inviteId,
            })
          },
        },
        actors: {
          addProject: fromPromise(async ({ input: projectDetails }) => {
            return this.#addProject({ ...projectDetails, projectName })
          }),
        },
        guards: {
          isNotAlreadyJoiningProject: () => {
            return !this.#isJoiningProject(projectInviteId)
          },
        },
      }),
      {
        input: inviteRpcMessage,
      }
    )

    this.#invites.set(inviteId, { value: invite, actor, peerId })

    this.emit('invite-received', toInvite(invite, actor.getSnapshot(), peerId))
    actor.start()
    // Subscribe after start so that initial state (invite-received) is not emitted twice
    actor.subscribe((snapshot) => {
      this.emit('invite-updated', toInvite(invite, snapshot, peerId))
    })
  }

  /**
   * @param {InviteCancel} inviteCancel
   */
  #handleInviteCancel(inviteCancel) {
    const { inviteId } = inviteCancel

    this.#l.log('Received invite cancel for invite ID %h', inviteId)

    const invite = this.#invites.get(inviteId)
    assert(!!invite, `Cannot find invite ${inviteId.toString('hex')}`)

    // TODO: Move this logging to the state machine
    const state = invite.actor.getSnapshot()
    if (!state.can({ type: 'CANCEL_INVITE' })) {
      this.#l.log(
        'Received invite cancel for %h but invite is already in state %o',
        inviteId,
        state.value
      )
      return
    }

    invite.actor.send({ type: 'CANCEL_INVITE' })
  }

  /**
   * @param {string} peerId
   * @param {ProjectJoinDetails} projectJoinDetails
   */
  #handleGotProjectDetails(peerId, projectJoinDetails) {
    const invite = this.#invites.get(projectJoinDetails.inviteId)
    if (!invite) {
      this.#l.log(
        'Received project details for %h but invite is not found',
        projectJoinDetails.inviteId
      )
      return
    }
    if (!timingSafeEqual(peerId, invite.peerId)) {
      this.#l.log(
        'Received project details for %h but peer ID does not match',
        projectJoinDetails.inviteId
      )
      return
    }
    invite.actor.send({
      type: 'RECEIVE_PROJECT_DETAILS',
      ...projectJoinDetails,
    })
  }

  /**
   * Get all invites (in all)
   *
   * @returns {Array<Invite>}
   */
  getMany() {
    /** @type {Array<Invite>} */
    const invites = []
    for (const { value, actor, peerId } of this.#invites.values()) {
      const snapshot = actor.getSnapshot()
      invites.push(toInvite(value, snapshot, peerId))
    }
    return invites
  }

  /**
   * Get an invite by inviteId
   *
   * @param {string} inviteIdString
   * @returns {Invite}
   */
  getById(inviteIdString) {
    const inviteId = Buffer.from(inviteIdString, 'hex')
    const invite = this.#invites.get(inviteId)
    if (!invite) {
      throw new NotFoundError(`Cannot find invite ${inviteIdString}`)
    }
    return toInvite(invite.value, invite.actor.getSnapshot(), invite.peerId)
  }

  /**
   * Attempt to accept the invite.
   *
   * This can fail if the invitor has canceled the invite or if you cannot
   * connect to the invitor's device.
   *
   * If the invite is accepted and you had other invites to the same project,
   * those invites are removed, and the invitors are told that you're already
   * part of this project.
   *
   * @param {Pick<Invite, 'inviteId'>} invite
   * @returns {Promise<string>}
   */
  async accept({ inviteId: inviteIdString }) {
    const inviteId = Buffer.from(inviteIdString, 'hex')

    const invite = this.#invites.get(inviteId)
    assert(!!invite, `Cannot find invite ${inviteIdString}`)
    assertCanSend(invite.actor, { type: 'ACCEPT_INVITE' })

    this.#l.log('Accepting invite %h', inviteId)
    invite.actor.send({ type: 'ACCEPT_INVITE' })

    for (const { value, actor } of this.#invites.values()) {
      const inviteIsForSameProject = value.projectInviteId.equals(
        invite.value.projectInviteId
      )
      if (inviteIsForSameProject) {
        actor.send({ type: 'ALREADY_IN_PROJECT' })
      }
    }

    const { projectPublicId } = await toPromise(invite.actor)

    if (!projectPublicId) {
      const errorMsg =
        invite.actor.getSnapshot().context.errorMessage || 'Unknown error'
      throw new Error(errorMsg)
    }

    return projectPublicId
  }

  /**
   * @param {Pick<Invite, 'inviteId'>} invite
   * @returns {void}
   */
  reject({ inviteId: inviteIdString }) {
    const inviteId = Buffer.from(inviteIdString, 'hex')

    const invite = this.#invites.get(inviteId)
    assert(!!invite, `Cannot find invite ${inviteIdString}`)
    assertCanSend(invite.actor, { type: 'REJECT_INVITE' })

    this.#l.log('Rejecting invite %h', inviteId)
    invite.actor.send({ type: 'REJECT_INVITE' })
  }
}

/**
 * @param {InviteInternal} internal
 * @param {import('xstate').SnapshotFrom<invite.actor>} snapshot
 * @param {string} invitorDeviceId
 * @returns {Invite}
 */
function toInvite(internal, snapshot, invitorDeviceId) {
  return {
    ...internal,
    invitorDeviceId,
    inviteId: internal.inviteId.toString('hex'),
    projectInviteId: internal.projectInviteId.toString('hex'),
    state: toStateString(snapshot.value),
  }
}

/**
 * Assert that a given event type can be sent to the state machine (will throw
 * if there is no transition defined for this event type for the current state
 * of the machine)
 *
 * @template {import('xstate').AnyActorRef} T
 * @param {T} actor
 * @param {import('xstate').EventFrom<T>} eventType
 */
function assertCanSend(actor, eventType) {
  const state = actor.getSnapshot()
  assert(
    state.can(eventType),
    `Cannot send ${JSON.stringify(eventType)} in state ${state.value}`
  )
}

/**
 * @template {import('xstate').StateValue} T
 * @typedef {T extends string ? T : T extends import('xstate').StateValueMap ? keyof T : never} ExtractStateString
 */

/**
 * "Flatten" nested states into a top-level string, e.g. in our case the state
 * `{ joining: 'awaitingDetails' }` will be flattened to `'joining'`.
 *
 * @template {import('xstate').StateValue} T
 * @param {T} stateValue
 * @returns {ExtractStateString<T>}
 */
function toStateString(stateValue) {
  if (typeof stateValue === 'string') {
    // @ts-expect-error - typescript limitation
    return stateValue
  }
  // @ts-expect-error - typescript limitation
  return Object.keys(stateValue)[0]
}
