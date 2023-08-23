// @ts-check
import test from 'brittle'
import { MapeoRPC } from '../src/rpc/index.js'
import { InviteApi } from '../src/invite-api.js'
import { replicate } from './helpers/rpc.js'

test('Accept invite', async (t) => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()
  const inviteApi = new InviteApi({ rpc: r2 })

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, { projectKey })
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
  const inviteApi = new InviteApi({ rpc: r2 })

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, { projectKey })
    t.is(response, MapeoRPC.InviteResponse.REJECT)
  })

  inviteApi.on('invite-received', ({ projectId }) => {
    t.is(projectId, projectKey.toString('hex'))
    inviteApi.reject(projectId)
  })

  replicate(r1, r2)
})
