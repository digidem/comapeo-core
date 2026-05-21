import test from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'node:crypto'
import {
  PendingInvitesApi,
  PendingInvitesApiForProject,
} from '../src/invite/pending-invites-api.js'
import {
  MEMBER_ROLE_ID,
  COORDINATOR_ROLE_ID,
  BLOCKED_ROLE_ID,
} from '../src/roles.js'
import { pendingInvitesTable } from '../src/schema/client.js'
import { PendingInviteAlreadyExistsError } from '../src/errors.js'

/** @import {BetterSQLite3Database } from 'drizzle-orm/better-sqlite3' */

const PROJECT_ID = 'test-project-id'

/**
 * @typedef {object} TestEnv
 * @property {PendingInvitesApi} api
 * @property {PendingInvitesApiForProject} projectApi
 * @property {BetterSQLite3Database} db
 * @property {(shouldListen: boolean) => Promise<void>} setShouldListenOverInternet
 * @property {() => boolean[]} getShouldListenOverInternet - Get ordered call log of setShouldListenOverInternet
 */

/**
 * @typedef {object} SeedPendingInvite
 * @property {string} projectId
 * @property {string} inviteId
 * @property {Buffer} inviteIdBuffer
 * @property {string} url
 * @property {import('../src/roles.js').RoleIdForNewInvite} roleId
 */

/**
 * @param {{ seedPendingInvites?: SeedPendingInvite[] }} [opts]
 * @returns {TestEnv}
 */
function setup({ seedPendingInvites = [] } = {}) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: new URL('../drizzle/client', import.meta.url).pathname,
  })

  // Seed pending invites before creating the API
  for (const seed of seedPendingInvites) {
    db.insert(pendingInvitesTable)
      .values({
        projectId: seed.projectId,
        inviteId: seed.inviteId,
        inviteIdBuffer: seed.inviteIdBuffer,
        url: seed.url,
        roleId: seed.roleId,
        createdAt: Date.now(),
      })
      .run()
  }

  /** @type {boolean[]} */
  const shouldListenCalls = []
  /**
   * @param {boolean} value
   */
  async function setShouldListenOverInternet(value) {
    shouldListenCalls.push(value)
  }

  function getShouldListenOverInternet() {
    return shouldListenCalls
  }

  const api = new PendingInvitesApi(db, setShouldListenOverInternet)
  const projectApi = new PendingInvitesApiForProject(PROJECT_ID, api)

  return {
    api,
    projectApi,
    db,
    setShouldListenOverInternet,
    getShouldListenOverInternet,
  }
}

test('create() - basic functionality', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const url = 'https://example.com/invite/abc123'

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url,
    opts: {
      roleId: MEMBER_ROLE_ID,
      roleName: 'Member',
      roleDescription: 'A regular member',
    },
  })

  const retrieved = await api.getById(inviteIdString, PROJECT_ID)
  assert(retrieved, 'invite can be retrieved')
  assert.equal(retrieved.inviteId, inviteIdString)
  assert.equal(retrieved.url, url)
  assert.equal(retrieved.roleId, MEMBER_ROLE_ID)
  assert.equal(retrieved.roleName, 'Member')
  assert.equal(retrieved.roleDescription, 'A regular member')
  assert.ok(retrieved.createdAt, 'has createdAt timestamp')
})

test('create() - duplicate inviteId throws', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const url1 = 'https://example.com/invite/first'
  const url2 = 'https://example.com/invite/second'

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: url1,
    opts: {
      roleId: MEMBER_ROLE_ID,
    },
  })

  assert.rejects(
    api.create({
      projectId: PROJECT_ID,
      inviteId: inviteIdString,
      inviteIdBuffer: inviteId,
      url: url2,
      opts: {
        roleId: COORDINATOR_ROLE_ID,
        roleName: 'Coordinator',
      },
    }),
    { code: PendingInviteAlreadyExistsError.code },
    'Second create throws an error'
  )
})

test('getById() - non-existent invite', async () => {
  const { api } = setup()

  const result = await api.getById('non-existent-id', PROJECT_ID)
  assert.equal(result, undefined, 'returns undefined for non-existent invite')
})

test('getById() - invite from different project not found', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const result = await api.getById(inviteIdString, 'other-project-id')
  assert.equal(
    result,
    undefined,
    'returns undefined for invite in different project'
  )
})

test('getAll() - empty database', async () => {
  const { api } = setup()

  const invites = await api.getAll()
  assert.deepEqual(invites, [], 'returns empty array when no invites exist')
})

test('getAll() - multiple invites', async () => {
  const { api } = setup()

  const invite1 = randomBytes(32)
  const invite2 = randomBytes(32)
  const invite3 = randomBytes(32)

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite3.toString('hex'),
    inviteIdBuffer: invite3,
    url: 'https://example.com/3',
    opts: { roleId: BLOCKED_ROLE_ID },
  })

  const invites = await api.getAll()
  assert.equal(invites.length, 3, 'returns all three invites')

  const inviteIds = invites.map((i) => i.inviteId)
  assert.ok(inviteIds.includes(invite1.toString('hex')))
  assert.ok(inviteIds.includes(invite2.toString('hex')))
  assert.ok(inviteIds.includes(invite3.toString('hex')))
})

test('getAllForProject() - returns only invites for the project', async () => {
  const { api } = setup()

  const invite1 = randomBytes(32)
  const invite2 = randomBytes(32)

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.create({
    projectId: 'other-project-id',
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  const invites = await api.getAllForProject(PROJECT_ID)
  assert.equal(
    invites.length,
    1,
    'returns only invites for the specified project'
  )
  assert.equal(invites[0].inviteId, invite1.toString('hex'))
})

test('getAllForProject() - empty for project with no invites', async () => {
  const { api } = setup()

  const invites = await api.getAllForProject(PROJECT_ID)
  assert.deepEqual(
    invites,
    [],
    'returns empty array when project has no invites'
  )
})

test('update() - set inviteeDeviceId', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const beforeUpdate = await api.getById(inviteIdString, PROJECT_ID)
  assert.equal(beforeUpdate?.inviteeDeviceId, undefined)

  const inviteeDeviceId = randomBytes(32).toString('hex')
  await api.update(inviteIdString, PROJECT_ID, { inviteeDeviceId })

  const afterUpdate = await api.getById(inviteIdString, PROJECT_ID)
  assert.equal(afterUpdate?.inviteeDeviceId, inviteeDeviceId)
})

test('update() - scoped to project', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const inviteeDeviceId = randomBytes(32).toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  // Update with a different project ID should be a no-op
  await api.update(inviteIdString, 'other-project-id', { inviteeDeviceId })

  const afterUpdate = await api.getById(inviteIdString, PROJECT_ID)
  assert.equal(
    afterUpdate?.inviteeDeviceId,
    undefined,
    'invite not updated with wrong project ID'
  )
})

test('update() - update non-existent invite', async () => {
  const { api } = setup()

  const inviteeDeviceId = randomBytes(32).toString('hex')
  await api.update('non-existent-id', PROJECT_ID, { inviteeDeviceId })

  const result = await api.getById('non-existent-id', PROJECT_ID)
  assert.equal(result, undefined, 'no-op for non-existent invite')
})

test('delete() - single invite', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.delete(inviteIdString)

  const retrieved = await api.getById(inviteIdString, PROJECT_ID)
  assert.equal(retrieved, undefined, 'invite deleted')

  const all = await api.getAll()
  assert.equal(all.length, 0, 'invite removed from getAll')
})

test('delete() - non-existent invite', async () => {
  const { api } = setup()

  await api.delete('non-existent-id')

  const result = await api.getById('non-existent-id', PROJECT_ID)
  assert.equal(result, undefined, 'no-op for non-existent invite')
})

test('deleteAll() - clear all invites', async () => {
  const { api } = setup()

  const invite1 = randomBytes(32)
  const invite2 = randomBytes(32)
  const invite3 = randomBytes(32)

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite3.toString('hex'),
    inviteIdBuffer: invite3,
    url: 'https://example.com/3',
    opts: { roleId: BLOCKED_ROLE_ID },
  })

  await api.deleteAll()

  const all = await api.getAll()
  assert.equal(all.length, 0, 'all invites deleted')
})

test('deleteAll() - empty database', async () => {
  const { api } = setup()

  await api.deleteAll()

  const all = await api.getAll()
  assert.equal(all.length, 0, 'no-op on empty database')
})

test('deleteAllFrom() - clears invites only for the project', async () => {
  const { api } = setup()

  const invite1 = randomBytes(32)
  const invite2 = randomBytes(32)

  await api.create({
    projectId: PROJECT_ID,
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.create({
    projectId: 'other-project-id',
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  await api.deleteAllFrom(PROJECT_ID)

  const all = await api.getAll()
  assert.equal(all.length, 1, 'only other project invites remain')
  assert.equal(all[0].inviteId, invite2.toString('hex'))
})

test('deleteAllFrom() - empty for project with no invites', async () => {
  const { api } = setup()

  await api.deleteAllFrom(PROJECT_ID)
  const all = await api.getAll()
  assert.equal(all.length, 0, 'no-op on empty project')
})

test('Role ID validation on read', async () => {
  const { api, db } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  // Directly insert an invalid roleId into the database using Drizzle, bypassing the API
  await db.insert(pendingInvitesTable).values({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    roleId: 'invalid-role-id',
    createdAt: Date.now(),
  })

  await assert.rejects(
    async () => await api.getById(inviteIdString, PROJECT_ID),
    /Invalid roleId in database/,
    'throws error for invalid roleId on getById'
  )

  await assert.rejects(
    async () => await api.getAllForProject(PROJECT_ID),
    /Invalid roleId in database/,
    'throws error for invalid roleId on getAllForProject'
  )
})

test('Buffer persistence', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const retrieved = await api.getById(inviteIdString, PROJECT_ID)
  assert.ok(retrieved?.inviteIdBuffer.equals(inviteId), 'buffer is identical')
})

test('Timestamp verification', async () => {
  const { api } = setup()

  const beforeCreate = Date.now()
  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const afterCreate = Date.now()
  const retrieved = await api.getById(inviteIdString, PROJECT_ID)

  assert.ok(retrieved, 'able to retrieve')

  assert.ok(
    retrieved.createdAt >= beforeCreate && retrieved.createdAt <= afterCreate,
    'createdAt is between before and after create call'
  )
})

test('Optional fields', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: {
      roleId: MEMBER_ROLE_ID,
      // No roleName or roleDescription
    },
  })

  const retrieved = await api.getById(inviteIdString, PROJECT_ID)
  assert.equal(
    retrieved?.roleName,
    undefined,
    'roleName is undefined when not provided'
  )
  assert.equal(
    retrieved?.roleDescription,
    undefined,
    'roleDescription is undefined when not provided'
  )
})

test('create() and getAll() with inviteeDeviceId already set', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const inviteeDeviceId = randomBytes(32).toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.update(inviteIdString, PROJECT_ID, { inviteeDeviceId })

  const all = await api.getAll()
  assert.equal(all.length, 1)
  assert.equal(all[0].inviteeDeviceId, inviteeDeviceId)
})

// Tests for PendingInvitesApiForProject (scoped wrapper)

test('PendingInvitesApiForProject - create() auto-injects projectId', async () => {
  const { projectApi } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const url = 'https://example.com/invite/abc123'

  await projectApi.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url,
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const retrieved = await projectApi.getById(inviteIdString)
  assert(retrieved, 'invite can be retrieved')
  assert.equal(retrieved.inviteId, inviteIdString)
  assert.equal(retrieved.url, url)
})

test('PendingInvitesApiForProject - getAll() returns scoped invites', async () => {
  const { api, projectApi } = setup()

  const invite1 = randomBytes(32)
  const invite2 = randomBytes(32)

  await projectApi.create({
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  // Create an invite for a different project directly
  await api.create({
    projectId: 'other-project-id',
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  const invites = await projectApi.getAll()
  assert.equal(invites.length, 1, 'returns only scoped invites')
  assert.equal(invites[0].inviteId, invite1.toString('hex'))
})

test('PendingInvitesApiForProject - update() auto-scopes to project', async () => {
  const { projectApi } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await projectApi.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const inviteeDeviceId = randomBytes(32).toString('hex')
  await projectApi.update(inviteIdString, { inviteeDeviceId })

  const afterUpdate = await projectApi.getById(inviteIdString)
  assert.equal(afterUpdate?.inviteeDeviceId, inviteeDeviceId)
})

test('PendingInvitesApiForProject - delete() removes invite', async () => {
  const { projectApi } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await projectApi.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await projectApi.delete(inviteIdString)

  const retrieved = await projectApi.getById(inviteIdString)
  assert.equal(retrieved, undefined, 'invite deleted')
})

test('PendingInvitesApiForProject - deleteAll() removes only scoped invites', async () => {
  const { api, projectApi } = setup()

  const invite1 = randomBytes(32)
  const invite2 = randomBytes(32)

  await projectApi.create({
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  // Create an invite for a different project directly
  await api.create({
    projectId: 'other-project-id',
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  await projectApi.deleteAll()

  const all = await api.getAll()
  assert.equal(all.length, 1, 'only other project invite remains')
  assert.equal(all[0].inviteId, invite2.toString('hex'))
})

test('PendingInvitesApiForProject - getById() returns scoped invite', async () => {
  const { projectApi } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await projectApi.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const retrieved = await projectApi.getById(inviteIdString)
  assert(retrieved, 'invite can be retrieved')
  assert.equal(retrieved.inviteId, inviteIdString)
})

test('PendingInvitesApiForProject - getById() returns undefined for invite in other project', async () => {
  const { api, projectApi } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  // Create an invite in a different project directly
  await api.create({
    projectId: 'other-project-id',
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const retrieved = await projectApi.getById(inviteIdString)
  assert.equal(
    retrieved,
    undefined,
    'returns undefined for invite in other project'
  )
})

test('PendingInvitesApiForProject - getById() returns undefined for non-existent invite', async () => {
  const { projectApi } = setup()

  const result = await projectApi.getById('non-existent-id')
  assert.equal(result, undefined, 'returns undefined for non-existent invite')
})

test('PendingInvitesApiForProject - delete() is no-op for non-existent invite', async () => {
  const { projectApi } = setup()

  await projectApi.delete('non-existent-id') // should not throw

  const all = await projectApi.getAll()
  assert.equal(all.length, 0, 'no-op for non-existent invite')
})

test('PendingInvitesApiForProject - deleteAll() is no-op on empty project', async () => {
  const { api, projectApi } = setup()

  await projectApi.deleteAll() // should not throw

  const all = await api.getAll()
  assert.equal(all.length, 0, 'no-op on empty project')
})

test('setShouldListenOverInternet - _open() sets true when invites exist', async () => {
  const inviteId = randomBytes(32)
  const { api, getShouldListenOverInternet } = setup({
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: inviteId.toString('hex'),
        inviteIdBuffer: inviteId,
        url: 'https://example.com/invite',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  await api.ready()

  assert.deepEqual(
    getShouldListenOverInternet(),
    [true],
    'called with true when invites exist after ready()'
  )
})

test('setShouldListenOverInternet - _open() does not call when db is empty', async () => {
  const { api, getShouldListenOverInternet } = setup()

  await api.ready()

  assert.deepEqual(
    getShouldListenOverInternet(),
    [],
    'never called when db is empty'
  )
})

test('setShouldListenOverInternet - create() sets true on first invite', async () => {
  const { api, getShouldListenOverInternet } = setup()

  const inviteId = randomBytes(32)
  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId.toString('hex'),
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  assert.deepEqual(
    getShouldListenOverInternet(),
    [true],
    'called with true after first create'
  )
})

test('setShouldListenOverInternet - create() second invite does not call callback', async () => {
  const { api, getShouldListenOverInternet } = setup()

  const inviteId = randomBytes(32)
  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId.toString('hex'),
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const inviteId2 = randomBytes(32)
  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId2.toString('hex'),
    inviteIdBuffer: inviteId2,
    url: 'https://example.com/invite/2',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  assert.equal(
    getShouldListenOverInternet().length,
    1,
    'callback only called once on second create'
  )
})

test('setShouldListenOverInternet - create() after failure does not call callback', async () => {
  const { api, getShouldListenOverInternet } = setup()

  // Clear any initial state
  await api.deleteAll()
  const callsAfterDelete = getShouldListenOverInternet().slice()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  // Try duplicate (fails)
  await assert.rejects(
    api.create({
      projectId: PROJECT_ID,
      inviteId: inviteIdString,
      inviteIdBuffer: inviteId,
      url: 'https://example.com/dup',
      opts: { roleId: MEMBER_ROLE_ID },
    })
  )

  // Should only count the successful create
  assert.equal(
    getShouldListenOverInternet().length,
    callsAfterDelete.length + 1,
    'duplicate create does not call callback'
  )
})

test('setShouldListenOverInternet - delete() sets false when last invite removed', async () => {
  const { api, getShouldListenOverInternet } = setup()

  const inviteId = randomBytes(32)
  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId.toString('hex'),
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.delete(inviteId.toString('hex'))

  assert.deepEqual(
    getShouldListenOverInternet(),
    [true, false],
    'called true on create, false on delete'
  )
})

test('setShouldListenOverInternet - delete() does not call when invites remain', async () => {
  const { api, getShouldListenOverInternet } = setup()

  const inviteId = randomBytes(32)
  const inviteId2 = randomBytes(32)

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId.toString('hex'),
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })
  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId2.toString('hex'),
    inviteIdBuffer: inviteId2,
    url: 'https://example.com/invite/2',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.delete(inviteId.toString('hex'))
  // Still 1 invite after delete, no callback call
  assert.equal(
    getShouldListenOverInternet().length,
    1,
    'only one callback call'
  )
})

test('setShouldListenOverInternet - deleteAll() sets false regardless of count', async () => {
  const { api, getShouldListenOverInternet } = setup()

  const inviteId = randomBytes(32)
  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId.toString('hex'),
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.deleteAll()

  assert.deepEqual(
    getShouldListenOverInternet(),
    [true, false],
    'called true on create, false on deleteAll'
  )
})

test('setShouldListenOverInternet - deleteAllFrom() sets false only when last invite removed across projects', async () => {
  const { api, getShouldListenOverInternet } = setup()

  const inviteId = randomBytes(32)
  const inviteId2 = randomBytes(32)

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId.toString('hex'),
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })
  await api.create({
    projectId: 'other-project',
    inviteId: inviteId2.toString('hex'),
    inviteIdBuffer: inviteId2,
    url: 'https://example.com/invite/2',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  // Delete all from first project, other still has invite
  await api.deleteAllFrom(PROJECT_ID)
  // Still 1 invite (from other project), no callback call
  assert.equal(getShouldListenOverInternet().length, 1)

  // Delete all from second project
  await api.deleteAllFrom('other-project')
  // 0 invites remain
  assert.deepEqual(
    getShouldListenOverInternet(),
    [true, false],
    'called true on create, false on deleteAllFrom last project'
  )
})

const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours in ms

test('clearExpired - expired invites are removed on getAll()', async () => {
  const { api, db } = setup({
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: 'expired-1',
        inviteIdBuffer: Buffer.from('expired-1'),
        url: 'https://example.com/expired',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  // Directly update the createdAt to older than 24 hours
  await db
    .update(pendingInvitesTable)
    .set({ createdAt: Date.now() - EXPIRY_MS - 1000 })
    .where(eq(pendingInvitesTable.inviteId, 'expired-1'))

  const invites = await api.getAll()
  assert.equal(invites.length, 0, 'expired invite is not returned')

  // Verify the invite was actually deleted from the DB
  const all = await api.getAll()
  assert.equal(all.length, 0, 'expired invite is gone after getAll')
})

test('clearExpired - expired invites are removed on getAllForProject()', async () => {
  const inviteId = randomBytes(32)
  const { api, db } = setup({
    seedPendingInvites: [
      {
        projectId: 'other-project',
        inviteId: 'expired-1',
        inviteIdBuffer: Buffer.from('expired-1'),
        url: 'https://example.com/expired',
        roleId: MEMBER_ROLE_ID,
      },
      {
        projectId: PROJECT_ID,
        inviteId: inviteId.toString('hex'),
        inviteIdBuffer: inviteId,
        url: 'https://example.com/fresh',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  // Expire the invite in the other project
  await db
    .update(pendingInvitesTable)
    .set({ createdAt: Date.now() - EXPIRY_MS - 1000 })
    .where(eq(pendingInvitesTable.inviteId, 'expired-1'))

  const invites = await api.getAllForProject(PROJECT_ID)
  assert.equal(invites.length, 1)
  assert.equal(
    invites[0].inviteId,
    inviteId.toString('hex'),
    'fresh invite remains'
  )
})

test('clearExpired - expired invites are removed on getById()', async () => {
  const { api, db } = setup({
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: 'expired-1',
        inviteIdBuffer: Buffer.from('expired-1'),
        url: 'https://example.com/expired',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  // Directly update the createdAt to older than 24 hours
  await db
    .update(pendingInvitesTable)
    .set({ createdAt: Date.now() - EXPIRY_MS - 1000 })
    .where(eq(pendingInvitesTable.inviteId, 'expired-1'))

  const result = await api.getById('expired-1', PROJECT_ID)
  assert.equal(result, undefined, 'expired invite is not returned by getById')
})

test('clearExpired - expired invites are removed on update()', async () => {
  const inviteId = randomBytes(32)
  const { api, db } = setup({
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: 'expired-1',
        inviteIdBuffer: Buffer.from('expired-1'),
        url: 'https://example.com/expired',
        roleId: MEMBER_ROLE_ID,
      },
      {
        projectId: PROJECT_ID,
        inviteId: inviteId.toString('hex'),
        inviteIdBuffer: inviteId,
        url: 'https://example.com/fresh',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  // Expire one invite
  await db
    .update(pendingInvitesTable)
    .set({ createdAt: Date.now() - EXPIRY_MS - 1000 })
    .where(eq(pendingInvitesTable.inviteId, 'expired-1'))

  const inviteeDeviceId = randomBytes(32).toString('hex')
  await api.update(inviteId.toString('hex'), PROJECT_ID, { inviteeDeviceId })

  // Verify the expired invite was cleaned up during update
  const all = await api.getAll()
  assert.equal(all.length, 1)
  assert.equal(
    all[0].inviteId,
    inviteId.toString('hex'),
    'only fresh invite remains'
  )
  assert.equal(
    all[0].inviteeDeviceId,
    inviteeDeviceId,
    'fresh invite was updated correctly'
  )
})

test('clearExpired - non-expired invites are not affected', async () => {
  const inviteId = randomBytes(32)
  const { api } = setup({
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: inviteId.toString('hex'),
        inviteIdBuffer: inviteId,
        url: 'https://example.com/fresh',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  const invites = await api.getAll()
  assert.equal(invites.length, 1, 'fresh invite is returned')
  assert.equal(invites[0].inviteId, inviteId.toString('hex'))
})

test('clearExpired - sets shouldListenOverInternet to false when all invites expire', async () => {
  const { api, db, getShouldListenOverInternet } = setup({
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: 'expired-1',
        inviteIdBuffer: Buffer.from('expired-1'),
        url: 'https://example.com/expired',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  await api.ready()

  // _open() already called setShouldListenOverInternet(true) because invite exists
  assert.deepEqual(getShouldListenOverInternet(), [true])

  // Expire the invite
  await db
    .update(pendingInvitesTable)
    .set({ createdAt: Date.now() - EXPIRY_MS - 1000 })
    .where(eq(pendingInvitesTable.inviteId, 'expired-1'))

  await api.getAll()

  assert.deepEqual(
    getShouldListenOverInternet(),
    [true, false],
    'called with false when all invites were expired and deleted'
  )
})
