import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { KeyManager } from '@mapeo/crypto'

import { MemberApi } from '../src/member-api.js'
import { LocalPeers } from '../src/local-peers.js'
import { MEMBER_ROLE_ID, ROLES } from '../src/roles.js'
import { DeviceInfo_DeviceType } from '../src/generated/rpc.js'
import { makeInviteURL, parseInviteURL } from '../src/invite/invite-urls.js'
import { InvalidInviteURLKeyParameterError } from '../src/errors.js'
import { CrockfordBase32 } from 'crockford-base32'

/** @import { ProjectJoinDetails } from '../src/generated/rpc.js' */
/** @import WebSocket from 'ws' */
/** @import { InviteLinkCreate, InviteLinkRecord } from '../src/invite/invite-links-api.js' */

const MAX_URL_LENGTH = 256

test('serialize and parse invite URLs', () => {
  const testSwarmPublicKey = randomBytes(32).toString('hex')
  const testInviteId = randomBytes(32).toString('hex')
  // Timestamp gets rounded to seconds anyway
  const expiresAt = Math.round(Date.now() / 1000) * 1000
  const params = {
    inviteIdString: testInviteId,
    swarmPublicKey: testSwarmPublicKey,
    invitorName: 'some name here',
    projectName: 'my cool project',
    expiresAt,
  }
  const url = makeInviteURL(params)

  assert(url.length < MAX_URL_LENGTH, 'URL smaller than the max')

  const parsedParams = parseInviteURL(url)

  assert.deepEqual(parsedParams, params, 'got same params that got passed in')
})

test('parseInviteURL throws on non-32-byte invite id', () => {
  // Encode only 16 bytes instead of 32
  const shortKey = CrockfordBase32.encode(randomBytes(16))
  const url = `https://i.comapeo.app/invite/#i=${shortKey}&d=${CrockfordBase32.encode(
    randomBytes(32)
  )}&n=test&p=test&e=${Math.floor(Date.now() / 1000)}`

  assert.throws(
    () => parseInviteURL(url),
    {
      code: InvalidInviteURLKeyParameterError.code,
    },
    'should throw InvalidInviteURLKeyParameterError for short invite id'
  )
})

test('parseInviteURL throws on non-32-byte swarm public key', () => {
  // Encode only 16 bytes instead of 32
  const shortKey = CrockfordBase32.encode(randomBytes(16))
  const url = `https://i.comapeo.app/invite/#i=${CrockfordBase32.encode(
    randomBytes(32)
  )}&d=${shortKey}&n=test&p=test&e=${Math.floor(Date.now() / 1000)}`

  assert.throws(
    () => parseInviteURL(url),
    {
      code: InvalidInviteURLKeyParameterError.code,
    },
    'should throw InvalidInviteURLKeyParameterError for short swarm public key'
  )
})

test('List pending invites over internet', async () => {
  const { member, inviteLinks } = setup({})

  const url1 = await member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const url2 = await member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const pending = await member.listInviteLinks()

  assert.deepEqual(
    pending.map((p) => p.url).sort(),
    [url1, url2].sort(),
    'Both pending URLs returned'
  )

  // Verify persistence
  const persisted = await inviteLinks.getAll()
  assert.equal(persisted.length, 2, 'Two invites persisted')
  const persistedUrls = persisted.map((p) => p.url)
  assert.ok(persistedUrls.includes(url1), 'url1 is persisted')
  assert.ok(persistedUrls.includes(url2), 'url2 is persisted')
})

test('Cancel invite over internet requests', async () => {
  const { member, inviteLinks } = setup({})

  const url1 = await member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const url2 = await member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  // Verify both invites are persisted
  let persisted = await inviteLinks.getAll()
  assert.equal(persisted.length, 2, 'Two invites persisted initially')

  await member.cancelInviteLink(url1)

  assert.deepEqual(
    await member.listInviteLinks().then((r) => r.map((p) => p.url)),
    [url2],
    'One URL left'
  )

  // Verify only url2 remains in persistence
  persisted = await inviteLinks.getAll()
  assert.equal(persisted.length, 1, 'One invite remains after cancel')
  assert.equal(persisted[0].url, url2, 'url2 is still persisted')

  await member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })
  await member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  // Verify 3 invites now persisted
  persisted = await inviteLinks.getAll()
  assert.equal(
    persisted.length,
    3,
    'Three invites persisted after adding two more'
  )

  await member.cancelInviteLink()

  assert.deepEqual(
    await member.listInviteLinks().then((r) => r.map((p) => p.url)),
    [],
    'No URLs left'
  )

  // Verify persistence is cleared
  persisted = await inviteLinks.getAll()
  assert.equal(persisted.length, 0, 'All invites removed from persistence')
})

test('Pending invites are loaded from persistence on ready', async () => {
  const inviteLinks = new MockInviteLinksApiForProject()
  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const swarmPublicKey = randomBytes(32).toString('hex')
  const url = makeInviteURL({
    inviteIdString,
    swarmPublicKey,
    invitorName: 'hello',
    projectName: 'world',
    expiresAt: Date.now(),
  })

  // Pre-populate the mock with a pending invite
  await inviteLinks.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url,
    opts: {
      roleId: MEMBER_ROLE_ID,
      roleName: 'Member',
    },
  })

  const { member } = setup({
    inviteLinks,
  })

  const pending = await member.listInviteLinks()
  assert.deepEqual(
    pending.map((p) => p.url),
    [url],
    'Pending invite loaded from persistence'
  )
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
    return ROLES[MEMBER_ROLE_ID]
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
 * In-memory mock of InviteLinksApi for testing
 */
class MockInviteLinksApiForProject {
  /** @type {Map<string, InviteLinkRecord>} */
  #invites = new Map()

  /**
   * Create a new pending invite record
   * @param {Omit<InviteLinkCreate, 'projectId'>} data
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
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    })
  }

  /**
   * Get a pending invite by invite ID
   * @param {string} inviteId
   * @returns {Promise<InviteLinkRecord | undefined>}
   */
  async getById(inviteId) {
    return this.#invites.get(inviteId)
  }

  /**
   * Get all pending invites
   * @returns {Promise<InviteLinkRecord[]>}
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
 * @param {(deviceId: string) => Promise<import('../src/member-api.js').MemberDeviceInfo>} [opts.getDeviceInfo]
 * @param {(deviceId: string, deviceInfo: import('../src/member-api.js').NewDeviceInfo) => Promise<void>} [opts.setDeviceInfo]
 * @param {MockInviteLinksApiForProject} [opts.inviteLinks]
 * @returns
 */
function setup({
  rootKey = Buffer.alloc(16, 1),
  getProjectSettings = () =>
    Promise.resolve({ name: 'example', sendStats: false }),
  getDeviceInfo = () =>
    Promise.resolve({
      name: 'Test Device',
      deviceType: DeviceInfo_DeviceType.desktop,
      createdAt: new Date().toString(),
    }),
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
  inviteLinks = new MockInviteLinksApiForProject(),
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
    inviteLinks,
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
    inviteLinks,
  }
}
