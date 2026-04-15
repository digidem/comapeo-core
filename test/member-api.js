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
/** @import {PendingInviteRecord, PendingInviteCreate,PendingInviteUpdate} from '../src/pending-invites-api.js' */

test('serialize and parse invite URLs', () => {
  const testDeviceId = 'foo'
  const testInviteId = 'bar'

  const url = makeInviteURL(testInviteId, testDeviceId)

  const { inviteIdString, deviceId } = parseInviteURL(url)

  assert.equal(inviteIdString, testInviteId)
  assert.equal(deviceId, testDeviceId)
})

test('List pending invites over internet', async () => {
  const { member } = setup({})

  const url1 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const url2 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const pending = await member.pendingInternetInvites()

  assert.deepEqual(
    pending.toSorted(),
    [url1, url2].toSorted(),
    'Both pending URLs returned'
  )
})

test('setShouldListenOverInternet called once for multiple invites', async () => {
  let callCount = 0
  const { member } = setup({
    setShouldListenOverInternet: async (shouldListen) => {
      assert(shouldListen)
      callCount++
    },
  })

  await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  assert.equal(callCount, 1, 'only set once')
})

test('Cancel invite over internet requests', async () => {
  const { member } = setup({})

  const url1 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const url2 = await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  await member.cancelInviteOverInternet(url1)

  assert.deepEqual(
    await member.pendingInternetInvites(),
    [url2],
    'One URL left'
  )
  await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })
  await member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  await member.cancelInviteOverInternet()

  assert.deepEqual(await member.pendingInternetInvites(), [], 'No URLs left')
})

test('Pending invites are loaded from persistence on ready', async () => {
  const pendingInvitesApi = new MockPendingInvitesApi()
  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const deviceId = randomBytes(32).toString('hex')
  const url = makeInviteURL(inviteIdString, deviceId)

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

  let didStartInternet = false

  const { member } = setup({
    pendingInvitesApi,
    setShouldListenOverInternet: async (shouldStart) => {
      didStartInternet = shouldStart
    },
  })

  // Wait for member API to be ready (loads pending invites)
  await member.ready()

  assert.ok(didStartInternet, 'Did start listening on internet')

  // Verify the pending invite was loaded
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
class MockPendingInvitesApi {
  /** @type {Map<string, PendingInviteRecord>} */
  #invites = new Map()

  /**
   * Create a new pending invite record
   * @param {PendingInviteCreate} data
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
    const invite = this.#invites.get(inviteId)
    return invite
      ? { ...invite, inviteeDeviceId: invite.inviteeDeviceId ?? undefined }
      : undefined
  }

  /**
   * Get all pending invites
   * @returns {Promise<PendingInviteRecord[]>}
   */
  async getAll() {
    return Array.from(this.#invites.values()).map((invite) => ({
      ...invite,
      inviteeDeviceId: invite.inviteeDeviceId ?? undefined,
    }))
  }

  /**
   * Update a pending invite (e.g., set invitee device ID when redeemed)
   * @param {string} inviteId
   * @param {PendingInviteUpdate} updates
   * @returns {Promise<void>}
   */
  async update(inviteId, updates) {
    const invite = this.#invites.get(inviteId)
    if (invite) {
      Object.assign(invite, updates)
    }
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
 * @param {(shouldListen: boolean) => Promise<void>} [opts.setShouldListenOverInternet]
 * @param {(deviceId: string) => Promise<boolean>} [opts.markInternetPeerAsTrusted]
 * @param {(deviceId: string) => Promise<void>} [opts.disconnectFromPeer]
 * @param {() => Promise<import('../src/mapeo-project.js').EditableProjectSettings>} [opts.getProjectSettings]
 * @param {(deviceId: string) => Promise<import('../src/schema.js').DeviceInfo>} [opts.getDeviceInfo]
 * @param {(deviceId: string, deviceInfo: import('../src/member-api.js').NewDeviceInfo) => Promise<void>} [opts.setDeviceInfo]
 * @param {MockPendingInvitesApi} [opts.pendingInvitesApi]
 * @returns
 */
function setup({
  rootKey = Buffer.alloc(16, 1),
  setShouldListenOverInternet = () => Promise.resolve(),
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
  pendingInvitesApi = new MockPendingInvitesApi(),
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
    swarmPublicKey: identityKeypair.publicKey,
    rpc,
    roles,
    encryptionKeys,
    projectKey,
    pendingInvitesApi,
    makeWebsocket,
    getReplicationStream,
    waitForInitialSyncWithPeer,
    disconnectFromPeer,
    setShouldListenOverInternet,
    markInternetPeerAsTrusted,
    getProjectSettings,
    getDeviceInfo,
    setDeviceInfo,
  })

  return {
    rpc,
    roles,
    member,
    projectKey,
    pendingInvitesApi,
  }
}
