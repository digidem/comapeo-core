import { setup, assign, fromPromise } from 'xstate'
import { omit } from '../lib/omit.js'
import ensureError from 'ensure-error'

const RECEIVE_PROJECT_DETAILS_TIMEOUT_MS = 10_000
const ADD_PROJECT_TIMEOUT_MS = 10_000

/** @import { StringToTaggedUnion } from '../types.js' */
/** @import { ProjectJoinDetails } from '../generated/rpc.js' */
/**
 * @internal
 * @typedef {{ errorMessage: null | string, projectPublicId: null | string }} Context
 */
/**
 * @typedef {object} MachineSetupTypes
 * @property {Context} context
 * @property {{ projectPublicId: string | null }} output
 * @property {StringToTaggedUnion<'ACCEPT_INVITE' | 'CANCEL_INVITE' | 'REJECT_INVITE' | 'ALREADY_IN_PROJECT' | 'ADDED_PROJECT'> | ({ type: 'RECEIVE_PROJECT_DETAILS' } & ProjectJoinDetails)} events
 */

export const inviteStateMachine = setup({
  types: /** @type {MachineSetupTypes} */ ({}),
  actions: {
    doAcceptInvite: () => {},
    doRejectInvite: () => {},
    doRespondAlready: () => {},
  },
  actors: {
    addProject: fromPromise(
      /**
       * @param {{ input: ProjectJoinDetails }} _opts
       * @returns {Promise<string>} The project public ID
       */
      async (_opts) => ''
    ),
  },
  guards: {
    isNotAlreadyJoiningProject: () => true,
  },
  delays: {
    receiveTimeout: RECEIVE_PROJECT_DETAILS_TIMEOUT_MS,
    addProjectTimeout: ADD_PROJECT_TIMEOUT_MS,
  },
}).createMachine({
  id: 'invite',
  context: {
    errorMessage: null,
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
            target: 'joining',
            guard: { type: 'isNotAlreadyJoiningProject' },
            actions: { type: 'doAcceptInvite' },
          },
          {
            target: 'error',
            actions: assign({ errorMessage: 'Already accepting project' }),
          },
        ],
        ALREADY_IN_PROJECT: {
          target: 'respondedAlready',
          actions: { type: 'doRespondAlready' },
        },
        REJECT_INVITE: {
          target: 'rejected',
          actions: { type: 'doRejectInvite' },
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
            input: ({ event }) => {
              if (event.type !== 'RECEIVE_PROJECT_DETAILS') {
                throw new Error('Invalid event type: ' + event.type)
              }
              return omit(event, ['type'])
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
    respondedAlready: {
      description: 'Responded that already in project',
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

// Error.stackTraceLimit = 100

// const actor = createActor(
//   inviteStateMachine.provide({
//     actors: {
//       addProject: fromPromise(async () => 'projectPublicId'),
//     },
//   })
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

// process.on('uncaughtException', (e) => {
//   console.log('Uncaught exception:', e.message)
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

// console.log('state value', actor.getSnapshot().status)
