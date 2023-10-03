import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { MapeoRPC } from '../src/rpc/index.js'
import { MemberApi } from '../src/member-api.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import {
  BLOCKED_ROLE_ID,
  DEFAULT_CAPABILITIES,
  MEMBER_ROLE_ID,
} from '../src/capabilities.js'
import { replicate } from './helpers/rpc.js'

test('invite() sends expected project-related details', async (t) => {
  t.plan(4)

  const { projectKey, encryptionKeys, rpc: r1, capabilities } = setup()

  const projectInfo = createProjectRecord({ name: 'mapeo' })
  const r2 = new MapeoRPC()

  const memberApi = new MemberApi({
    capabilities,
    encryptionKeys,
    projectKey,
    rpc: r1,
    dataTypes: {
      project: {
        async getByDocId() {
          return projectInfo
        },
      },
    },
  })
  r1.on('peers', async (peers) => {
    const response = await memberApi.invite(peers[0].id, {
      roleId: MEMBER_ROLE_ID,
    })

    t.is(response, InviteResponse_Decision.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.alike(invite.projectKey, projectKey)
    t.alike(invite.encryptionKeys, encryptionKeys)
    t.alike(invite.projectInfo?.name, projectInfo.name)

    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: InviteResponse_Decision.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('invite() assigns role to invited device after invite accepted', async (t) => {
  t.plan(4)

  const { projectKey, encryptionKeys, rpc: r1 } = setup()

  const r2 = new MapeoRPC()

  const expectedRoleId = MEMBER_ROLE_ID
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
    encryptionKeys,
    projectKey,
    rpc: r1,
    dataTypes: {
      project: {
        async getByDocId() {
          return createProjectRecord({ name: 'mapeo' })
        },
      },
    },
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
    t.test(decision, (st) => {
      st.plan(1)

      const { projectKey, encryptionKeys, rpc: r1, capabilities } = setup()

      const r2 = new MapeoRPC()

      const capabilitiesSpy = {
        ...capabilities,
        // This should not be called at any point in this test
        async assignRole() {
          st.fail(
            'Attempted to assign role despite decision being non-acceptance'
          )
        },
      }

      const memberApi = new MemberApi({
        capabilities: capabilitiesSpy,
        encryptionKeys,
        projectKey,
        rpc: r1,
        dataTypes: {
          project: {
            async getByDocId() {
              return createProjectRecord({ name: 'mapeo' })
            },
          },
        },
      })

      r1.on('peers', async (peers) => {
        const response = await memberApi.invite(peers[0].id, {
          roleId: MEMBER_ROLE_ID,
        })

        st.is(response, decision)
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
  const { projectKey, encryptionKeys, rpc, capabilities } = setup()

  const deviceId = randomBytes(32).toString('hex')

  const deviceInfo = createDeviceInfoRecord({ deviceId, name: 'member' })

  // Pre-populate data
  await capabilities.assignRole(deviceId, MEMBER_ROLE_ID)
  const deviceInfoRecords = [deviceInfo]

  const memberApi = new MemberApi({
    capabilities,
    encryptionKeys,
    projectKey,
    rpc,
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
      capabilities: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    },
    'returns matching member'
  )

  await t.exception(async () => {
    const randomDeviceId = randomBytes(32).toString('hex')
    await memberApi.getById(randomDeviceId)
  }, 'throws when no match')
})

test('getMany() works', async (t) => {
  const { projectKey, encryptionKeys, rpc, capabilities } = setup()

  const deviceInfoRecords = []

  const memberApi = new MemberApi({
    capabilities,
    encryptionKeys,
    projectKey,
    rpc,
    queries: { getProjectInfo: async () => {} },
    dataTypes: {
      deviceInfo: {
        async getMany() {
          return deviceInfoRecords
        },
      },
    },
  })

  const initialMembers = await memberApi.getMany()

  t.is(initialMembers.length, 0, 'no initial members')

  // Pre-populate data
  for (let i = 0; i < 3; i++) {
    const deviceInfo = createDeviceInfoRecord({ name: `member${i + 1}` })
    deviceInfoRecords.push(deviceInfo)
    await capabilities.assignRole(deviceInfo.docId, MEMBER_ROLE_ID)
  }

  const members = await memberApi.getMany()

  t.is(members.length, 3)

  for (const member of members) {
    t.alike(member.capabilities, DEFAULT_CAPABILITIES[MEMBER_ROLE_ID])

    const deviceInfo = deviceInfoRecords.find(
      ({ docId }) => docId === member.deviceId
    )

    t.ok(deviceInfo)
    t.is(member.name, deviceInfo?.name)
  }
})

function setup() {
  const projectKey = KeyManager.generateProjectKeypair().publicKey
  const encryptionKeys = { auth: randomBytes(32) }
  const rpc = new MapeoRPC()

  /** @type {Map<string, import('../src/capabilities.js').RoleId>} */
  const memberRoles = new Map()

  /** @type {Pick<import('../src/capabilities.js').Capabilities, "assignRole" | "getCapabilities">} */
  const capabilities = {
    async assignRole(deviceId, role) {
      memberRoles.set(deviceId, role)
    },
    async getCapabilities(deviceId) {
      const roleId = memberRoles.get(deviceId)
      return DEFAULT_CAPABILITIES[roleId || BLOCKED_ROLE_ID]
    },
  }

  return {
    capabilities,
    projectKey,
    encryptionKeys,
    rpc,
  }
}

/**
 * @param {Object} opts
 * @param {string} [opts.deviceId]
 * @param {string} opts.name
 * @returns {import('@mapeo/schema').DeviceInfo}
 */
function createDeviceInfoRecord({ deviceId, name }) {
  const docId = deviceId || randomBytes(32).toString('hex')
  const createdBy = randomBytes(32).toString('hex')

  return {
    schemaName: 'deviceInfo',
    docId,
    name,
    versionId: `${docId}/0`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    links: [],
  }
}

/**
 * @param {Object} opts
 * @param {string} [opts.projectId]
 * @param {string} opts.name
 * @returns {import('@mapeo/schema').ProjectSettings}
 */
function createProjectRecord({ projectId, name }) {
  const docId = projectId || randomBytes(32).toString('hex')
  const createdBy = randomBytes(32).toString('hex')

  return {
    schemaName: 'projectSettings',
    docId,
    name,
    versionId: `${docId}/0`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    links: [],
  }
}
