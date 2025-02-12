import { setup, assign, fromPromise } from 'xstate'
import { omit } from '../lib/omit.js'
import ensureError from 'ensure-error'

const RECEIVE_PROJECT_DETAILS_TIMEOUT_MS = 10_000
const ADD_PROJECT_TIMEOUT_MS = 10_000

/** @import { MapBuffers, StringToTaggedUnion } from '../types.js' */
/**
 * @import {
 *   Invite as InviteRpcMessage,
 *   ProjectJoinDetails,
 * } from '../generated/rpc.js'
 */
/** @import { AddProjectQuery } from '../invite-api.js' */
/**
 * @internal
 * @typedef {InviteRpcMessage & { receivedAt: number, errorMessage: null | string, projectPublicId: null | string }} InviteContext
 */

/**
 * @typedef {object} MachineSetupTypes
 * @property {InviteContext} context
 * @property {{ projectPublicId: string | null }} output
 * @property {StringToTaggedUnion<'ACCEPT_INVITE' | 'CANCEL_INVITE' | 'REJECT_INVITE' | 'ADDED_PROJECT'> | ({ type: 'RECEIVE_PROJECT_DETAILS' } & ProjectJoinDetails)} events
 * @property {InviteRpcMessage} input
 */

export const inviteStateMachine = setup({
  types: /** @type {MachineSetupTypes} */ ({}),
  actions: {
    /** @param {{ inviteId: MachineSetupTypes['input']['inviteId'] }} _params */
    doAcceptInvite: (_, _params) => {},
    /** @param {{ inviteId: MachineSetupTypes['input']['inviteId'] }} _params */
    doRejectInvite: (_, _params) => {},
  },
  actors: {
    addProject: fromPromise(
      /**
       * @param {{ input: Parameters<AddProjectQuery>[0] }} _opts
       * @returns {Promise<string>} The project public ID
       */
      async (_opts) => ''
    ),
  },
  guards: {
    /** @param {{ projectInviteId: MachineSetupTypes['input']['projectInviteId'] }} _params */
    isNotAlreadyJoiningProject: (_, _params) => true,
  },
  delays: {
    receiveTimeout: RECEIVE_PROJECT_DETAILS_TIMEOUT_MS,
    addProjectTimeout: ADD_PROJECT_TIMEOUT_MS,
  },
}).createMachine({
  id: 'invite',
  context: ({ input }) => ({
    ...input,
    receivedAt: Date.now(),
    errorMessage: null,
    projectPublicId: null,
  }),
  initial: 'pending',
  states: {
    pending: {
      description: 'Pending invite awaiting response',
      on: {
        CANCEL_INVITE: { target: 'canceled' },
        ACCEPT_INVITE: [
          {
            target: 'joining',
            guard: {
              type: 'isNotAlreadyJoiningProject',
              params: ({ context }) => ({
                projectInviteId: context.projectInviteId,
              }),
            },
            actions: {
              type: 'doAcceptInvite',
              params: ({ context }) => ({ inviteId: context.inviteId }),
            },
          },
          {
            target: 'error',
            actions: assign({ errorMessage: 'Already accepting project' }),
          },
        ],
        REJECT_INVITE: {
          target: 'rejected',
          actions: {
            type: 'doRejectInvite',
            params: ({ context }) => ({ inviteId: context.inviteId }),
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
                errorMessage: 'Timed out waiting for project details',
              }),
            },
          },
        },
        addingProject: {
          description: 'Adding project from invite',
          invoke: {
            src: 'addProject',
            input: ({ event, context }) => {
              if (event.type !== 'RECEIVE_PROJECT_DETAILS') {
                throw new Error('Invalid event type: ' + event.type)
              }
              return {
                ...omit(event, ['type']),
                projectName: context.projectName,
              }
            },
            onDone: {
              target: '#invite.joined',
              actions: assign({
                projectPublicId: ({ event }) => event.output,
              }),
            },
            onError: {
              target: '#invite.error',
              actions: assign({
                errorMessage: ({ event }) => ensureError(event.error).message,
              }),
            },
          },
          after: {
            addProjectTimeout: {
              target: '#invite.error',
              actions: assign({
                errorMessage: 'Timed out adding project',
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
    joined: {
      description: 'Successfully joined project',
      type: 'final',
    },
    error: {
      type: 'final',
      description: 'Error joining project',
    },
  },
  output: ({ context }) => ({ projectPublicId: context.projectPublicId }),
})

// const actor = createActor(
//   inviteStateMachine.provide({
//     actors: {
//       addProject: fromPromise(async ({ signal }) => {
//         // await delay(1000, { signal })
//         return 'abcd1234'
//       }),
//     },
//   }),
//   {
//     input: {
//       inviteId: '1234',
//       projectInviteId: 'abcd',
//       projectName: 'My Project',
//       invitorName: 'Alice',
//     },
//   }
// )

// actor.start()

// actor.subscribe((state) => {
//   console.log({
//     value: state.value,
//     context: state.context,
//     status: state.status,
//   })
//   if (state.status === 'done') {
//     console.log('Project public ID:', state.context.projectPublicId)
//   }
// })

// actor.send({ type: 'ACCEPT_INVITE' })

// actor.send({
//   type: 'RECEIVE_PROJECT_DETAILS',
//   projectKey: Buffer.from([0]),
//   inviteId: Buffer.from([0]),
//   encryptionKeys: {
//     auth: Buffer.from([0]),
//   },
// })

// console.log('state value', actor.getSnapshot().value)
