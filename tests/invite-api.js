import test from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { MapeoRPC } from '../src/rpc/index.js'
import { InviteApi } from '../src/invite-api.js'
import { replicate } from './helpers/rpc.js'

test('Accept invite', async (t) => {
  t.plan(4)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const projects = new Map()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async (projectId) => {
        return projects.has(projectId)
      },
      addProject: async (invite) => {
        projects.set(invite.projectKey.toString('hex'), invite)
      },
    },
  })

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)

    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })

    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'))

    await inviteApi.accept(projectId)

    t.ok(projects.has(projectId), 'project successfully added')
  })

  replicate(r1, r2)
})

test('Reject invite', async (t) => {
  t.plan(4)

  const { rpc: r1, projectKey, encryptionKeys } = setup()

  const projects = new Map()

  const r2 = new MapeoRPC()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async (projectId) => {
        return projects.has(projectId)
      },
      addProject: async (invite) => {
        projects.set(invite.projectKey.toString('hex'), invite)
      },
    },
  })

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)

    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })

    t.is(response, MapeoRPC.InviteResponse.REJECT)
  })

  inviteApi.on('invite-received', async ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'))

    await inviteApi.reject(projectId)

    t.is(projects.has(projectId), false, 'project not added')
  })

  replicate(r1, r2)
})

test('Receiving invite for project that peer already belongs to', async (t) => {
  t.test('was member prior to connection', async (t) => {
    t.plan(2)

    const { rpc: r1, projectKey, encryptionKeys } = setup()

    // Start off being already part of the project
    const projects = new Map([
      [projectKey.toString('hex'), { projectKey, encryptionKeys }],
    ])

    const r2 = new MapeoRPC()

    const inviteApi = new InviteApi({
      rpc: r2,
      queries: {
        isMember: async (projectId) => {
          return projects.has(projectId)
        },
        addProject: async (invite) => {
          projects.set(invite.projectKey.toString('hex'), invite)
        },
      },
    })

    r1.on('peers', async (peers) => {
      t.is(peers.length, 1)

      const response = await r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })

      t.is(
        response,
        MapeoRPC.InviteResponse.ALREADY,
        'invited peer automatically responds with "ALREADY"'
      )
    })

    inviteApi.on('invite-received', () => {
      t.fail('invite-received event should not have been emitted')
    })

    replicate(r1, r2)
  })

  t.test('became member from accepting prior invite', async (t) => {
    t.plan(3)

    const { rpc: r1, projectKey, encryptionKeys } = setup()

    const projects = new Map()

    const r2 = new MapeoRPC()

    const inviteApi = new InviteApi({
      rpc: r2,
      queries: {
        isMember: async (projectId) => {
          return projects.has(projectId)
        },
        addProject: async (invite) => {
          projects.set(invite.projectKey.toString('hex'), invite)
        },
      },
    })

    r1.on('peers', async (peers) => {
      const response1 = await r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })

      t.is(response1, MapeoRPC.InviteResponse.ACCEPT)

      const response2 = await r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys,
      })

      t.is(response2, MapeoRPC.InviteResponse.ALREADY)
    })

    let inviteReceivedEventCount = 0

    inviteApi.on('invite-received', ({ projectId }) => {
      inviteReceivedEventCount += 1
      t.is(inviteReceivedEventCount, 1)

      inviteApi.accept(projectId)
    })

    replicate(r1, r2)
  })
})

function setup() {
  const encryptionKeys = { auth: randomBytes(32) }
  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const rpc = new MapeoRPC()

  return {
    rpc,
    projectKey,
    encryptionKeys,
  }
}
