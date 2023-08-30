import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'

import { MapeoRPC } from '../src/rpc/index.js'
import { MemberApi } from '../src/member-api.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { replicate } from './helpers/rpc.js'

test('Invite sends expected project-related details', async (t) => {
  t.plan(4)

  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const encryptionKeys = { auth: randomBytes(32) }
  const projectInfo = { name: 'mapeo' }

  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const memberApi = new MemberApi({
    encryptionKeys,
    getProjectInfo: async () => projectInfo,
    projectKey,
    rpc: r1,
  })

  r1.on('peers', async (peers) => {
    const response = await memberApi.invite(peers[0].id, {
      role: 'member',
    })

    t.is(response, InviteResponse_Decision.ACCEPT)
  })

  r2.on('invite', async (peerId, invite) => {
    t.alike(invite.projectKey, projectKey)
    t.alike(invite.encryptionKeys, encryptionKeys)
    t.alike(invite.projectInfo, projectInfo)

    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: InviteResponse_Decision.ACCEPT,
    })
  })

  replicate(r1, r2)
})
