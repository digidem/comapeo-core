import test from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { MapeoRPC } from '../src/rpc/index.js'
import { InviteApi } from '../src/invite-api.js'
import { replicate } from './helpers/rpc.js'

test('Accept invite', async (t) => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const members = new Set()
  const projects = new Map()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async (deviceId) => {
        return members.has(deviceId)
      },
      addProject: async (projectId, encryptionKeys) => {
        projects.set(projectId, encryptionKeys)
      },
    },
  })

  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const encryptionKeys = { auth: randomBytes(32) }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })
    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  inviteApi.on('invite-received', ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'))
    inviteApi.accept(projectId)
  })

  replicate(r1, r2)
})

test('Reject invite', async (t) => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const members = new Set()
  const projects = new Map()

  const inviteApi = new InviteApi({
    rpc: r2,
    queries: {
      isMember: async (deviceId) => {
        return members.has(deviceId)
      },
      addProject: async (projectId, encryptionKeys) => {
        projects.set(projectId, encryptionKeys)
      },
    },
  })

  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const encryptionKeys = { auth: randomBytes(32) }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })
    t.is(response, MapeoRPC.InviteResponse.REJECT)
  })

  inviteApi.on('invite-received', ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'))
    inviteApi.reject(projectId)
  })

  replicate(r1, r2)
})
