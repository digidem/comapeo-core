import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'node:crypto'
import {
  DEFAULT_INVITE_EXPIRY_MS,
  InviteLinksApi,
  InviteLinksApiForProject,
} from '../src/invite/invite-links-api.js'
import {
  MEMBER_ROLE_ID,
  COORDINATOR_ROLE_ID,
  BLOCKED_ROLE_ID,
} from '../src/roles.js'
import { inviteLinksTable } from '../src/schema/client.js'
import { InviteLinkAlreadyExistsError } from '../src/errors.js'

/** @import {BetterSQLite3Database } from 'drizzle-orm/better-sqlite3' */
/** @import {InviteLinkRecord} from '../src/invite/invite-links-api.js' */

const PROJECT_ID = 'test-project-id'

/**
 * @typedef {object} TestEnv
 * @property {InviteLinksApi} api
 * @property {InviteLinksApiForProject} projectApi
 * @property {BetterSQLite3Database} db
 * @property {(shouldListen: boolean) => Promise<void>} setShouldListenOverInternet
 * @property {() => boolean[]} getShouldListenOverInternet - Get ordered call log of setShouldListenOverInternet
 */

/**
 * @typedef {object} SeedOptionals
 * @property {number} [createdAt]
 * @property {number} [expiresAt]
 * @property {number} [seedTime]
 * @property {string} projectId
 */

/**
 * @typedef {Omit<InviteLinkRecord, keyof SeedOptionals> & SeedOptionals} SeedPendingInvite
 */

/**
 * @param {import('node:test').TestContext} t
 * @param {{ seedPendingInvites?: SeedPendingInvite[], expiryMs?: number }} [opts]
 * @returns {TestEnv}
 */
function setup(
  t,
  { seedPendingInvites = [], expiryMs = DEFAULT_INVITE_EXPIRY_MS } = {}
) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: new URL('../drizzle/client', import.meta.url).pathname,
  })

  // Seed pending invites before creating the API
  for (const seed of seedPendingInvites) {
    db.insert(inviteLinksTable)
      .values({
        ...seed,
        createdAt: seed.createdAt ?? Date.now(),
        seedTime: seed.seedTime ?? Date.now(),
        expiresAt: seed.expiresAt ?? Date.now() + expiryMs,
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

  const api = new InviteLinksApi(db, setShouldListenOverInternet, expiryMs)
  const projectApi = new InviteLinksApiForProject(PROJECT_ID, api)

  t.after(() => api.close())

  return {
    api,
    projectApi,
    db,
    setShouldListenOverInternet,
    getShouldListenOverInternet,
  }
}

test('create() - basic functionality', async (t) => {
  const { api } = setup(t)

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

test('create() - duplicate inviteId throws', async (t) => {
  const { api } = setup(t)

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
    { code: InviteLinkAlreadyExistsError.code },
    'Second create throws an error'
  )
})

test('getById() - non-existent invite', async (t) => {
  const { api } = setup(t)

  const result = await api.getById('non-existent-id', PROJECT_ID)
  assert.equal(result, undefined, 'returns undefined for non-existent invite')
})

test('getById() - invite from different project not found', async (t) => {
  const { api } = setup(t)

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

test('getAll() - empty database', async (t) => {
  const { api } = setup(t)

  const invites = await api.getAll()
  assert.deepEqual(invites, [], 'returns empty array when no invites exist')
})

test('getAll() - multiple invites', async (t) => {
  const { api } = setup(t)

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

test('getAllForProject() - returns only invites for the project', async (t) => {
  const { api } = setup(t)

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

test('getAllForProject() - empty for project with no invites', async (t) => {
  const { api } = setup(t)

  const invites = await api.getAllForProject(PROJECT_ID)
  assert.deepEqual(
    invites,
    [],
    'returns empty array when project has no invites'
  )
})

test('delete() - single invite', async (t) => {
  const { api } = setup(t)

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

test('delete() - non-existent invite', async (t) => {
  const { api } = setup(t)

  await api.delete('non-existent-id')

  const result = await api.getById('non-existent-id', PROJECT_ID)
  assert.equal(result, undefined, 'no-op for non-existent invite')
})

test('deleteAll() - clear all invites', async (t) => {
  const { api } = setup(t)

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

test('deleteAll() - empty database', async (t) => {
  const { api } = setup(t)

  await api.deleteAll()

  const all = await api.getAll()
  assert.equal(all.length, 0, 'no-op on empty database')
})

test('deleteAllFrom() - clears invites only for the project', async (t) => {
  const { api } = setup(t)

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

test('deleteAllFrom() - empty for project with no invites', async (t) => {
  const { api } = setup(t)

  await api.deleteAllFrom(PROJECT_ID)
  const all = await api.getAll()
  assert.equal(all.length, 0, 'no-op on empty project')
})

test('Role ID validation on read', async (t) => {
  const { api, db } = setup(t)

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  // Directly insert an invalid roleId into the database using Drizzle, bypassing the API
  await db.insert(inviteLinksTable).values({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    roleId: 'invalid-role-id',
    createdAt: Date.now(),
    seedTime: Date.now(),
    expiresAt: Date.now() + DEFAULT_INVITE_EXPIRY_MS,
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

test('Buffer persistence', async (t) => {
  const { api } = setup(t)

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

test('Timestamp verification', async (t) => {
  const { api } = setup(t)

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

test('Optional fields', async (t) => {
  const { api } = setup(t)

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

test('create() and getAll()', async (t) => {
  const { api } = setup(t)

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const all = await api.getAll()
  assert.equal(all.length, 1)
  assert.equal(all[0].inviteId, inviteIdString)
})

// Tests for InviteLinksApiForProject (scoped wrapper)

test('InviteLinksApiForProject - create() auto-injects projectId', async (t) => {
  const { projectApi } = setup(t)

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

test('InviteLinksApiForProject - getAll() returns scoped invites', async (t) => {
  const { api, projectApi } = setup(t)

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

test('InviteLinksApiForProject - delete() removes invite', async (t) => {
  const { projectApi } = setup(t)

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

test('InviteLinksApiForProject - deleteAll() removes only scoped invites', async (t) => {
  const { api, projectApi } = setup(t)

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

test('InviteLinksApiForProject - getById() returns scoped invite', async (t) => {
  const { projectApi } = setup(t)

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

test('InviteLinksApiForProject - getById() returns undefined for invite in other project', async (t) => {
  const { api, projectApi } = setup(t)

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

test('InviteLinksApiForProject - getById() returns undefined for non-existent invite', async (t) => {
  const { projectApi } = setup(t)

  const result = await projectApi.getById('non-existent-id')
  assert.equal(result, undefined, 'returns undefined for non-existent invite')
})

test('InviteLinksApiForProject - delete() is no-op for non-existent invite', async (t) => {
  const { projectApi } = setup(t)

  await projectApi.delete('non-existent-id') // should not throw

  const all = await projectApi.getAll()
  assert.equal(all.length, 0, 'no-op for non-existent invite')
})

test('InviteLinksApiForProject - deleteAll() is no-op on empty project', async (t) => {
  const { api, projectApi } = setup(t)

  await projectApi.deleteAll() // should not throw

  const all = await api.getAll()
  assert.equal(all.length, 0, 'no-op on empty project')
})

test('setShouldListenOverInternet - _open() sets true when invites exist', async (t) => {
  const inviteId = randomBytes(32)
  const { api, getShouldListenOverInternet } = setup(t, {
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

test('setShouldListenOverInternet - _open() does not call when db is empty', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

  await api.ready()

  assert.deepEqual(
    getShouldListenOverInternet(),
    [],
    'never called when db is empty'
  )
})

test('setShouldListenOverInternet - create() sets true on first invite', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

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

test('setShouldListenOverInternet - create() second invite does not call callback', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

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

test('setShouldListenOverInternet - create() after failure does not call callback', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

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

test('setShouldListenOverInternet - delete() sets false when last invite removed', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

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

test('setShouldListenOverInternet - delete() does not call when invites remain', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

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

test('setShouldListenOverInternet - deleteAll() sets false regardless of count', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

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

test('setShouldListenOverInternet - deleteAllFrom() sets false only when last invite removed across projects', async (t) => {
  const { api, getShouldListenOverInternet } = setup(t)

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

const TEST_EXPIRY_MS = 50 // 50ms expiry for testing

test('clearExpired - general cleanup via schedule', async (t) => {
  const { api } = setup(t, {
    expiryMs: TEST_EXPIRY_MS,
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: 'auto-expire-1',
        inviteIdBuffer: Buffer.from('auto-expire-1'),
        url: 'https://example.com/auto-expire',
        roleId: MEMBER_ROLE_ID,
        createdAt: Date.now() - TEST_EXPIRY_MS + 5, // expires in ~45ms
      },
    ],
  })

  await api.ready()
  await new Promise((resolve) => setTimeout(resolve, TEST_EXPIRY_MS * 2))

  const invites = await api.getAll()
  assert.equal(invites.length, 0, 'invite was auto-cleaned by scheduled expiry')
})

test('scheduleExpired - creates first invite schedules expiry', async (t) => {
  const { api } = setup(t, { expiryMs: TEST_EXPIRY_MS })

  await api.ready()
  const inviteId = randomBytes(32)
  await api.create({
    projectId: PROJECT_ID,
    inviteId: inviteId.toString('hex'),
    inviteIdBuffer: inviteId,
    url: 'https://example.com/fresh',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  // Wait for invite to expire and scheduled cleanup to fire
  await new Promise((resolve) => setTimeout(resolve, TEST_EXPIRY_MS + 200))

  const invites = await api.getAll()
  assert.equal(
    invites.length,
    0,
    'singular invite was auto-cleaned by scheduled expiry'
  )
})

test('scheduleExpired - cancelling timer on close', async (t) => {
  const { api } = setup(t, {
    expiryMs: TEST_EXPIRY_MS,
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: 'close-1',
        inviteIdBuffer: Buffer.from('close-1'),
        url: 'https://example.com/close',
        roleId: MEMBER_ROLE_ID,
        createdAt: Date.now() - TEST_EXPIRY_MS + 5,
      },
    ],
  })

  await api.ready()
  api.close()

  const invites = await api.getAll()
  assert.equal(invites.length, 1, 'invite still exists (close cancelled timer)')
})

test('scheduleExpired - deleting last invite cancels timer', async (t) => {
  const { api } = setup(t, {
    expiryMs: TEST_EXPIRY_MS,
    seedPendingInvites: [
      {
        projectId: PROJECT_ID,
        inviteId: 'delete-cancels-1',
        inviteIdBuffer: Buffer.from('delete-cancels-1'),
        url: 'https://example.com/delete-cancels',
        roleId: MEMBER_ROLE_ID,
      },
    ],
  })

  await api.ready()
  await api.delete('delete-cancels-1')

  const invites = await api.getAll()
  assert.equal(invites.length, 0, 'invite was deleted')

  await new Promise((resolve) => setTimeout(resolve, 200))
  const stillGone = await api.getAll()
  assert.equal(
    stillGone.length,
    0,
    'no timer firing after delete (none to check against)'
  )
})
