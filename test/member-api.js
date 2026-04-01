import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { KeyManager } from '@mapeo/crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { makeInviteURL, MemberApi, parseInviteURL } from '../src/member-api.js'
import { LocalPeers } from '../src/local-peers.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'

/** @import { ProjectJoinDetails } from '../src/generated/rpc.js' */
/** @import WebSocket from 'ws' */

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

  const pending = member.pendingInternetInvites()

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
 *
 * @param {Object} [opts]
 * @param {Buffer} [opts.rootKey]
 * @param {(url: string) => WebSocket} [opts.makeWebsocket]
 * @param {() => import('../src/types.js').ReplicationStream} [opts.getReplicationStream]
 * @param {(deviceId: string, abortSignal: AbortSignal) => Promise<void>} [opts.waitForInitialSyncWithPeer]
 * @param {(shouldListen: boolean) => Promise<void>} [opts.setShouldListenOverInternet]
 * @param {() => Promise<import('../src/mapeo-project.js').EditableProjectSettings>} [opts.getProjectSettings]
 * @param {(deviceId: string) => Promise<import('../src/schema.js').DeviceInfo>} [opts.getDeviceInfo]
 * @param {(deviceId: string, deviceInfo: import('../src/member-api.js').NewDeviceInfo) => Promise<void>} [opts.setDeviceInfo]
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
  makeWebsocket = () => {
    throw new Error('Not implemented')
  },
  getReplicationStream = () => {
    throw new Error('Not implemented')
  },
} = {}) {
  const keyManager = new KeyManager(rootKey)

  const identityKeypair = keyManager.getIdentityKeypair()
  const encryptionKeys = { auth: randomBytes(32) }
  const projectKey = KeyManager.generateProjectKeypair().publicKey

  const deviceId = identityKeypair.publicKey.toString('hex')

  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

  const rpc = new MockLocalPeers()
  const roles = new MockRoles()

  const member = new MemberApi({
    deviceId,
    swarmPublicKey: identityKeypair.publicKey,
    rpc,
    roles,
    encryptionKeys,
    projectKey,
    makeWebsocket,
    getReplicationStream,
    waitForInitialSyncWithPeer,
    setShouldListenOverInternet,
    getProjectSettings,
    getDeviceInfo,
    setDeviceInfo,
  })

  return {
    rpc,
    roles,
    member,
    projectKey,
  }
}
