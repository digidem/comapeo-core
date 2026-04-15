import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'node:crypto'
import { PendingInvitesApi } from '../src/pending-invites-api.js'
import {
  MEMBER_ROLE_ID,
  COORDINATOR_ROLE_ID,
  BLOCKED_ROLE_ID,
} from '../src/roles.js'
import { pendingInvitesTable } from '../src/schema/project.js'
import { PendingInviteAlreadyExistsError } from '../src/errors.js'

/** @import {BetterSQLite3Database } from 'drizzle-orm/better-sqlite3' */

/**
 * @returns {{api:PendingInvitesApi, db:BetterSQLite3Database}}
 */
function setup() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

  const api = new PendingInvitesApi(db)

  return { api, db }
}

test('create() - basic functionality', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const url = 'https://example.com/invite/abc123'

  await api.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url,
    opts: {
      roleId: MEMBER_ROLE_ID,
      roleName: 'Member',
      roleDescription: 'A regular member',
    },
  })

  const retrieved = await api.getById(inviteIdString)
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
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: url1,
    opts: {
      roleId: MEMBER_ROLE_ID,
    },
  })

  assert.rejects(
    api.create({
      inviteId: inviteIdString,
      inviteIdBuffer: inviteId,
      url: url2,
      opts: {
        roleId: COORDINATOR_ROLE_ID,
        roleName: 'Coordinator',
      },
    }),
    { code: PendingInviteAlreadyExistsError.code },
    'Second reate throws an error'
  )
})

test('getById() - non-existent invite', async () => {
  const { api } = setup()

  const result = await api.getById('non-existent-id')
  assert.equal(result, undefined, 'returns undefined for non-existent invite')
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
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.create({
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  await api.create({
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

test('update() - set inviteeDeviceId', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const beforeUpdate = await api.getById(inviteIdString)
  assert.equal(beforeUpdate?.inviteeDeviceId, undefined)

  const inviteeDeviceId = randomBytes(32).toString('hex')
  await api.update(inviteIdString, { inviteeDeviceId })

  const afterUpdate = await api.getById(inviteIdString)
  assert.equal(afterUpdate?.inviteeDeviceId, inviteeDeviceId)
})

test('update() - update non-existent invite', async () => {
  const { api } = setup()

  const inviteeDeviceId = randomBytes(32).toString('hex')
  await api.update('non-existent-id', { inviteeDeviceId })

  const result = await api.getById('non-existent-id')
  assert.equal(result, undefined, 'no-op for non-existent invite')
})

test('delete() - single invite', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.delete(inviteIdString)

  const retrieved = await api.getById(inviteIdString)
  assert.equal(retrieved, undefined, 'invite deleted')

  const all = await api.getAll()
  assert.equal(all.length, 0, 'invite removed from getAll')
})

test('delete() - non-existent invite', async () => {
  const { api } = setup()

  await api.delete('non-existent-id')

  const result = await api.getById('non-existent-id')
  assert.equal(result, undefined, 'no-op for non-existent invite')
})

test('deleteAll() - clear all invites', async () => {
  const { api } = setup()

  const invite1 = randomBytes(32)
  const invite2 = randomBytes(32)
  const invite3 = randomBytes(32)

  await api.create({
    inviteId: invite1.toString('hex'),
    inviteIdBuffer: invite1,
    url: 'https://example.com/1',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.create({
    inviteId: invite2.toString('hex'),
    inviteIdBuffer: invite2,
    url: 'https://example.com/2',
    opts: { roleId: COORDINATOR_ROLE_ID },
  })

  await api.create({
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

test('Role ID validation on read', async () => {
  const { api, db } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  // Directly insert an invalid roleId into the database using Drizzle, bypassing the API
  await db.insert(pendingInvitesTable).values({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    roleId: 'invalid-role-id',
    createdAt: Date.now(),
  })

  await assert.rejects(
    async () => await api.getById(inviteIdString),
    /Invalid roleId in database/,
    'throws error for invalid roleId on getById'
  )

  await assert.rejects(
    async () => await api.getAll(),
    /Invalid roleId in database/,
    'throws error for invalid roleId on getAll'
  )
})

test('Buffer persistence', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const retrieved = await api.getById(inviteIdString)
  assert.ok(retrieved?.inviteIdBuffer.equals(inviteId), 'buffer is identical')
})

test('Timestamp verification', async () => {
  const { api } = setup()

  const beforeCreate = Date.now()
  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')

  await api.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  const afterCreate = Date.now()
  const retrieved = await api.getById(inviteIdString)

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
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: {
      roleId: MEMBER_ROLE_ID,
      // No roleName or roleDescription
    },
  })

  const retrieved = await api.getById(inviteIdString)
  assert.equal(
    retrieved?.roleName,
    null,
    'roleName is undefined when not provided'
  )
  assert.equal(
    retrieved?.roleDescription,
    null,
    'roleDescription is undefined when not provided'
  )
})

test('create() and getAll() with inviteeDeviceId already set', async () => {
  const { api } = setup()

  const inviteId = randomBytes(32)
  const inviteIdString = inviteId.toString('hex')
  const inviteeDeviceId = randomBytes(32).toString('hex')

  await api.create({
    inviteId: inviteIdString,
    inviteIdBuffer: inviteId,
    url: 'https://example.com/invite',
    opts: { roleId: MEMBER_ROLE_ID },
  })

  await api.update(inviteIdString, { inviteeDeviceId })

  const all = await api.getAll()
  assert.equal(all.length, 1)
  assert.equal(all[0].inviteeDeviceId, inviteeDeviceId)
})
