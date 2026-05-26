import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { KeyManager } from '@mapeo/crypto'

import { makeInviteURL, MemberApi, parseInviteURL } from '../src/member-api.js'
import { LocalPeers } from '../src/local-peers.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'

/** @import { ProjectJoinDetails } from '../src/generated/rpc.js' */
/** @import WebSocket from 'ws' */
/** @import { InviteOptions } from '../src/member-api.js' */
/** @import { PendingInviteRecord, PendingInviteCreate } from '../src/invite/pending-invites-api.js' */

test('serialize and parse invite URLs', () => {
  const testSwarmPublicKey = 'foo'
  const testInviteId = 'bar'

  const url = makeInviteURL(testInviteId, testSwarmPublicKey)

  const { inviteIdString, swarmPublicKey } = parseInviteURL(url)

  assert.equal(inviteIdString, testInviteId)
  assert.equal(swarmPublicKey, testSwarmPublicKey)
})

test('List pending invites over internet', async () => {
  const { member, pendingInvitesApi } = setup({})

  const url1 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const url2 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const pending = await member.pendingInternetInvites()

  assert.deepEqual(
    pending.sort(),
    [url1, url2].sort(),
    'Both pending URLs returned'
  )

  // Verify persistence
  const persisted = await pendingInvitesApi.getAll()
  assert.equal(persisted.length, 2, 'Two invites persisted')
  const persistedUrls = persisted.map((p) => p.url)
  assert.ok(persistedUrls.includes(url1), 'url1 is persisted')
  assert.ok(persistedUrls.includes(url2), 'url2 is persisted')
})

test('Cancel invite over internet requests', async () => {
  const { member, pendingInvitesApi } = setup({})

  const url1 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const url2 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  // Verify both invites are persisted
  let persisted = await pendingInvitesApi.getAll()
  assert.equal(persisted.length, 2, 'Two invites persisted initially')

  await member.cancelInviteOverInternet(url1)

  assert.deepEqual(
    await member.pendingInternetInvites(),
    [url2],
    'One URL left'
  )

  // Verify only url2 remains in persistence
  persisted = await pendingInvitesApi.getAll()
  assert.equal(persisted.length, 1, 'One invite remains after cancel')
  assert.equal(persisted[0].url, url2, 'url2 is still persisted')

  await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })
  await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  // Verify 3 invites now persisted
  persisted = await pendingInvitesApi.getAll()
  assert.equal(
    persisted.length,
    3,
    'Three invites persisted after adding two more'
  )

  await member.cancelInviteOverInternet()

  assert.deepEqual(await member.pendingInternetInvites(), [], 'No URLs left')

  // Verify persistence is cleared
  persisted = await pendingInvitesApi.getAll()
  assert.equal(persisted.length, 0, 'All invites removed from persistence')
})

test('Pending invites are loaded from persistence on ready', async () => {
  const pendingInvitesApi = new MockPendingInvitesApiForProject()
  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const swarmPublicKey = randomBytes(32).toString('hex')
  const url = makeInviteURL(inviteIdString, swarmPublicKey)

  // Pre-populate the mock with a pending invite
  await pendingInvitesApi.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url,
    opts: {
      roleId: MEMBER_ROLE_ID,
      roleName: 'Member',
    },
  })

  const { member } = setup({
    pendingInvitesApi,
  })

  const pending = await member.pendingInternetInvites()
  assert.deepEqual(pending, [url], 'Pending invite loaded from persistence')
})

class MockLocalPeers extends LocalPeers {
  /**
   * @param {string} deviceId
   * @param {ProjectJoinDetails} details
   */
  async sendProjectJoinDetails(deviceId, details) {
    this.emit('got-project-details', deviceId, details)
  }
}

/** @extends {Roles} */
class MockRoles {
  /**
   * @param {string} _deviceId
   * @returns {Promise<import('../src/roles.js').Role>}
   */
  async getRole(_deviceId) {
    throw new Error('Not Implemented')
  }
  /**
   * @returns {Promise<Map<string, import('../src/roles.js').Role>>} Map of deviceId to Role
   */
  async getAll() {
    throw new Error('Not Implemented')
  }
  /**
   * @param {string} deviceId
   * @param {import('../src/roles.js').RoleIdAssignableToAnyone} roleId
   * @param {object} [opts]
   * @param {string} opts.reason
   */
  async assignRole(deviceId, roleId, opts) {
    throw new Error('Not Implemented' + deviceId + roleId + opts)
  }
}

/**
 * In-memory mock of PendingInvitesApi for testing
 */
class MockPendingInvitesApiForProject {
  /** @type {Map<string, PendingInviteRecord>} */
  #invites = new Map()

  /**
   * Create a new pending invite record
   * @param {Omit<PendingInviteCreate, 'projectId'>} data
   * @returns {Promise<void>}
   */
  async create(data) {
    this.#invites.set(data.inviteId, {
      inviteId: data.inviteId,
      inviteIdBuffer: data.inviteIdBuffer,
      url: data.url,
      roleId: data.opts.roleId,
      roleName: data.opts.roleName,
      roleDescription: data.opts.roleDescription,
      createdAt: Date.now(),
    })
  }

  /**
   * Get a pending invite by invite ID
   * @param {string} inviteId
   * @returns {Promise<PendingInviteRecord | undefined>}
   */
  async getById(inviteId) {
    return this.#invites.get(inviteId)
  }

  /**
   * Get all pending invites
   * @returns {Promise<PendingInviteRecord[]>}
   */
  async getAll() {
    return [...this.#invites.values()]
  }

  /**
   * @param {string} inviteId
   * @returns {Promise<void>}
   */
  async delete(inviteId) {
    this.#invites.delete(inviteId)
  }

  /**
   * @returns {Promise<void>}
   */
  async deleteAll() {
    this.#invites.clear()
  }
}

/**
 *
 * @param {Object} [opts]
 * @param {Buffer} [opts.rootKey]
 * @param {(url: string) => WebSocket} [opts.makeWebsocket]
 * @param {() => import('../src/types.js').ReplicationStream} [opts.getReplicationStream]
 * @param {(deviceId: string, abortSignal: AbortSignal) => Promise<void>} [opts.waitForInitialSyncWithPeer]
 * @param {(deviceId: string) => Promise<boolean>} [opts.markInternetPeerAsTrusted]
 * @param {(deviceId: string) => Promise<void>} [opts.disconnectFromPeer]
 * @param {() => Promise<import('../src/mapeo-project.js').EditableProjectSettings>} [opts.getProjectSettings]
 * @param {(deviceId: string) => Promise<import('../src/schema.js').DeviceInfo>} [opts.getDeviceInfo]
 * @param {(deviceId: string, deviceInfo: import('../src/member-api.js').NewDeviceInfo) => Promise<void>} [opts.setDeviceInfo]
 * @param {MockPendingInvitesApiForProject} [opts.pendingInvitesApi]
 * @returns
 */
function setup({
  rootKey = Buffer.alloc(16, 1),
  getProjectSettings = () =>
    Promise.resolve({ name: 'example', sendStats: false }),
  getDeviceInfo = () => Promise.reject(new Error('Not implemented')),
  setDeviceInfo = () => Promise.reject(new Error('Not implemented')),
  waitForInitialSyncWithPeer = () => Promise.resolve(),
  disconnectFromPeer = () => Promise.resolve(),
  makeWebsocket = () => {
    throw new Error('Not implemented')
  },
  getReplicationStream = () => {
    throw new Error('Not implemented')
  },
  markInternetPeerAsTrusted = () => Promise.resolve(true),
  pendingInvitesApi = new MockPendingInvitesApiForProject(),
} = {}) {
  const keyManager = new KeyManager(rootKey)

  const identityKeypair = keyManager.getIdentityKeypair()
  const encryptionKeys = { auth: randomBytes(32) }
  const projectKey = KeyManager.generateProjectKeypair().publicKey

  const deviceId = identityKeypair.publicKey.toString('hex')

  const rpc = new MockLocalPeers()
  const roles = new MockRoles()

  const member = new MemberApi({
    deviceId,
    rpc,
    roles,
    encryptionKeys,
    projectKey,
    pendingInvitesApi,
    makeWebsocket,
    getReplicationStream,
    waitForInitialSyncWithPeer,
    disconnectFromPeer,
    markInternetPeerAsTrusted,
    getProjectSettings,
    getDeviceInfo,
    setDeviceInfo,
    getSwarmPublicKey: () => identityKeypair.publicKey,
  })

  return {
    rpc,
    roles,
    member,
    projectKey,
    pendingInvitesApi,
  }
}
