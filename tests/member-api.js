import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { MapeoRPC } from '../src/rpc/index.js'
import { MemberApi } from '../src/member-api.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { replicate } from './helpers/rpc.js'

test('invite() sends expected project-related details', async (t) => {
  t.plan(4)

  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const encryptionKeys = { auth: randomBytes(32) }
  const projectInfo = { name: 'mapeo' }

  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const memberApi = new MemberApi({
    capabilities: { async assignRole() {} },
    encryptionKeys,
    projectKey,
    rpc: r1,
    queries: { getProjectInfo: async () => projectInfo },
  })

  r1.on('peers', async (peers) => {
    const response = await memberApi.invite(peers[0].id, {
      roleId: randomBytes(8).toString('hex'),
    })

    t.is(response, InviteResponse_Decision.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
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

test('invite() assigns role to invited device after invite accepted', async (t) => {
  t.plan(4)

  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const expectedRoleId = randomBytes(8).toString('hex')
  let expectedDeviceId = null

  // We're only testing that this gets called with the expected arguments
  const capabilities = {
    async assignRole(deviceId, roleId) {
      t.ok(expectedDeviceId)
      t.is(deviceId, expectedDeviceId)
      t.is(roleId, expectedRoleId)
    },
  }

  const memberApi = new MemberApi({
    capabilities,
    encryptionKeys: { auth: randomBytes(32) },
    projectKey: KeyManager.generateProjectKeypair().publicKey,
    rpc: r1,
    queries: { getProjectInfo: async () => {} },
  })

  r1.on('peers', async (peers) => {
    expectedDeviceId = peers[0].id

    const response = await memberApi.invite(expectedDeviceId, {
      roleId: expectedRoleId,
    })

    t.is(response, InviteResponse_Decision.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: InviteResponse_Decision.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('invite() does not assign role to invited device if invite is not accepted', async (t) => {
  const nonAcceptInviteDecisions = Object.values(
    InviteResponse_Decision
  ).filter((d) => d !== InviteResponse_Decision.ACCEPT)

  for (const decision of nonAcceptInviteDecisions) {
    t.test(decision, (t) => {
      t.plan(1)

      const r1 = new MapeoRPC()
      const r2 = new MapeoRPC()

      const capabilities = {
        // This should not be called at any point in this test
        async assignRole() {
          t.fail(
            'Attempted to assign role despite decision being non-acceptance'
          )
        },
      }

      const memberApi = new MemberApi({
        capabilities,
        encryptionKeys: { auth: randomBytes(32) },
        projectKey: KeyManager.generateProjectKeypair().publicKey,
        rpc: r1,
        queries: { getProjectInfo: async () => {} },
      })

      r1.on('peers', async (peers) => {
        const response = await memberApi.invite(peers[0].id, {
          roleId: randomBytes(8).toString('hex'),
        })

        t.is(response, decision)
      })

      r2.on('invite', (peerId, invite) => {
        r2.inviteResponse(peerId, {
          projectKey: invite.projectKey,
          decision,
        })
      })

      replicate(r1, r2)
    })
  }
})

test('getById() works', async (t) => {
  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const encryptionKeys = { auth: randomBytes(32) }

  const rpc = new MapeoRPC()

  const deviceId = randomBytes(32).toString('hex')

  /** @type {import('@mapeo/schema').DeviceInfo} */
  const deviceInfo = {
    schemaName: 'deviceInfo',
    docId: deviceId,
    name: 'mapeo',
    versionId: `${deviceId}/0`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    links: [],
  }

  const deviceInfoRecords = [deviceInfo]

  const memberApi = new MemberApi({
    capabilities: { async assignRole() {} },
    encryptionKeys,
    projectKey,
    rpc,
    queries: { getProjectInfo: async () => {} },
    dataTypes: {
      deviceInfo: {
        async getByDocId(deviceId) {
          const info = deviceInfoRecords.find(({ docId }) => docId === deviceId)
          if (!info) throw new Error(`No record with ID ${deviceId}`)
          return info
        },
      },
    },
  })

  const member = await memberApi.getById(deviceId)

  t.alike(
    member,
    {
      deviceId,
      name: deviceInfo.name,
    },
    'returns matching member'
  )

  await t.exception(async () => {
    const randomId = randomBytes(32)
    await memberApi.getById(randomId)
  }, 'throws when no match')
})
