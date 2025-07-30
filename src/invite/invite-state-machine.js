import { setup, assign, fromPromise, assertEvent, raise } from 'xstate'
import { omit } from '../lib/omit.js'
import { InviteResponse_Decision } from '../generated/rpc.js'
import ensureError from 'ensure-error'
import { TimeoutError } from '../errors.js'

const RECEIVE_PROJECT_DETAILS_TIMEOUT_MS = 45_000
const ADD_PROJECT_TIMEOUT_MS = 45_000

/** @import { StringToTaggedUnion } from '../types.js' */
/** @import { ProjectJoinDetails } from '../generated/rpc.js' */
/**
 * @internal
 * @typedef {object} Context
 * @property {null | Error} error
 * @property {null | string} projectPublicId
 */
/**
 * @typedef {object} MachineSetupTypes
 * @property {Context} context
 * @property {{ projectPublicId: string | null }} output
 * @property {StringToTaggedUnion<'ACCEPT_INVITE' | 'CANCEL_INVITE' | 'REJECT_INVITE' | 'ALREADY_IN_PROJECT' | 'ADDED_PROJECT' | 'PEER_DISCONNECTED'> | ({ type: 'RECEIVE_PROJECT_DETAILS' } & ProjectJoinDetails)} events
 */

export const inviteStateMachine = setup({
  types: /** @type {MachineSetupTypes} */ ({}),
  actors: {
    sendInviteResponse: fromPromise(
      /**
       * @param {{ input: { decision: InviteResponse_Decision }}} _opts
       */
      async (_opts) => {}
    ),
    addProject: fromPromise(
      /**
       * @param {{ input: ProjectJoinDetails }} _opts
       * @returns {Promise<string>} The project public ID
       */
      async (_opts) => ''
    ),
  },
  guards: {
    isNotAlreadyJoiningOrInProject: () => true,
  },
  delays: {
    receiveTimeout: RECEIVE_PROJECT_DETAILS_TIMEOUT_MS,
    addProjectTimeout: ADD_PROJECT_TIMEOUT_MS,
  },
}).createMachine({
  id: 'invite',
  context: {
    error: null,
    projectPublicId: null,
  },
  initial: 'pending',
  states: {
    pending: {
      description: 'Pending invite awaiting response',
      on: {
        CANCEL_INVITE: { target: 'canceled' },
        ACCEPT_INVITE: [
          {
            target: 'responding.accept',
            guard: { type: 'isNotAlreadyJoiningOrInProject' },
          },
          {
            actions: raise({ type: 'ALREADY_IN_PROJECT' }),
          },
        ],
        ALREADY_IN_PROJECT: {
          target: 'responding.already',
        },
        REJECT_INVITE: {
          target: 'responding.reject',
        },
      },
    },
    responding: {
      description: 'Responding to invite',
      initial: 'default',
      on: {
        CANCEL_INVITE: { target: '#invite.canceled' },
      },
      states: {
        default: {
          always: {
            target: '#invite.error',
            actions: assign({ error: () => new TypeError('InvalidState') }),
          },
        },
        accept: {
          description: 'Sending accept response',
          invoke: {
            src: 'sendInviteResponse',
            input: { decision: InviteResponse_Decision.ACCEPT },
            onDone: '#invite.joining',
            onError: '#invite.error',
          },
          on: {
            // It's possible project details could be received before the send
            // response promise resolves (e.g. somehow the peer receives the
            // response and sends the project details before the response is
            // confirmed as sent), so we accept project details at this point
            RECEIVE_PROJECT_DETAILS: {
              target: '#invite.joining.addingProject',
            },
          },
        },
        reject: {
          description: 'Sending reject response',
          invoke: {
            src: 'sendInviteResponse',
            input: { decision: InviteResponse_Decision.REJECT },
            onDone: '#invite.rejected',
            onError: '#invite.error',
          },
        },
        already: {
          description: 'Sending already response',
          invoke: {
            src: 'sendInviteResponse',
            input: { decision: InviteResponse_Decision.ALREADY },
            onDone: '#invite.respondedAlready',
            onError: '#invite.error',
          },
        },
      },
    },
    joining: {
      initial: 'awaitingDetails',
      description: 'Joining project from invite',
      states: {
        awaitingDetails: {
          description: 'Waiting for project details',
          on: {
            RECEIVE_PROJECT_DETAILS: { target: 'addingProject' },
            CANCEL_INVITE: { target: '#invite.canceled' },
          },
          after: {
            receiveTimeout: {
              target: '#invite.error',
              actions: assign({
                error: () =>
                  new TimeoutError('Timed out waiting for project details'),
              }),
            },
          },
        },
        addingProject: {
          description: 'Adding project from invite',
          invoke: {
            src: 'addProject',
            input: ({ event }) => {
              assertEvent(event, 'RECEIVE_PROJECT_DETAILS')
              return omit(event, ['type'])
            },
            onDone: {
              target: '#invite.joined',
              actions: assign({
                projectPublicId: ({ event }) => event.output,
              }),
            },
            onError: '#invite.error',
          },
          after: {
            addProjectTimeout: {
              target: '#invite.error',
              actions: assign({
                error: () => new TimeoutError('Timed out adding project'),
              }),
            },
          },
        },
      },
    },
    canceled: {
      description: 'The invite has been canceled',
      type: 'final',
    },
    rejected: {
      description: 'Rejected invite',
      type: 'final',
    },
    respondedAlready: {
      description: 'Responded that already in project',
      type: 'final',
    },
    joined: {
      description: 'Successfully joined project',
      type: 'final',
    },
    error: {
      entry: assign({
        error: ({ event, context }) =>
          context.error ||
          ensureError(
            // @ts-expect-error - xstate types are incorrect, for internal events
            // the error property can exist, and ensureError handles event.error
            // being undefined.
            event.error
          ),
      }),
      type: 'final',
      description: 'Error joining project',
    },
  },
  output: ({ context }) => ({ projectPublicId: context.projectPublicId }),
})
