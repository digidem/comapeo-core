import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'timers/promises'
import pTimeout from 'p-timeout'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import {
  BLOCKED_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
} from '../src/roles.js'
import { kCoreManager } from '../src/mapeo-project.js'
import { NAMESPACES } from '../src/constants.js'
import { createSyncScenario } from './sync-scenario.js'

// Roles gating sync ("capability"): what may and may not replicate with
// blocked, removed, and role-changed devices — including on live sessions
// and with stale role records.

/**
 * The auth-first gate: nothing beyond the auth namespace may replicate with a
 * peer until auth sync with that peer has completed, its records have been
 * indexed, and the peer's role re-read. This protects against stale role
 * records: without the gate, a device holding an out-of-date "member" record
 * for a removed device would start exchanging config (and, once initial sync
 * read as complete, data) with it before learning of the removal.
 */
test(
  'stale role record: no sync beyond auth with a removed device',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: {
        creator: {},
        coordinator: { role: COORDINATOR_ROLE_ID },
        removed: {},
      },
      // Remove the sync-state throttle: in the old implementation this made
      // the stale-capability window deterministic, so run the gate under the
      // same adversarial timing
      syncThrottleMs: 0,
    })

    // The coordinator blocks the "removed" device while the creator is
    // offline. The removed device receives its own block record (it lives
    // in the coordinator's auth core); the creator's record stays stale.
    // The bulk of other auth records written in the same offline period
    // keeps the indexer busy, so a capability check that raced indexing
    // (instead of awaiting it) would reliably read the stale record.
    await s.disconnectAll()
    await s.connect('coordinator', 'removed')
    for (let i = 0; i < 150; i++) {
      const dummyDeviceId = Buffer.from(
        `stale-role-dummy-${i}`.padEnd(32, '0').slice(0, 32)
      ).toString('hex')
      await s
        .project('coordinator')
        .$member.assignRole(dummyDeviceId, MEMBER_ROLE_ID)
    }
    await s.assignRole('coordinator', 'removed', BLOCKED_ROLE_ID)
    await s.waitForSync('initial', ['coordinator', 'removed'])
    await s.disconnectAll()

    assert.equal(
      (await s.project('removed').$member.getById(s.deviceId('removed'))).role
        .roleId,
      BLOCKED_ROLE_ID,
      'setup: removed device has received its own block record'
    )
    assert.notEqual(
      (await s.project('creator').$member.getById(s.deviceId('removed'))).role
        .roleId,
      BLOCKED_ROLE_ID,
      'setup: creator still holds a stale (not-blocked) role record'
    )

    // While still apart, the creator writes new config and data, and the
    // removed device writes new data. None of this may ever cross.
    const creatorSeed = await s.seed('creator', { preset: 1, observation: 1 })
    const removedSeed = await s.seed('removed', { observation: 1 })

    // The creator meets only the removed device; both enable data sync —
    // the worst case for the stale record.
    const assertDataNeverEnabled = s.recordStateInvariant(
      'creator',
      (state) => !state.devices[s.deviceId('removed')]?.data.isSyncEnabled,
      'data sync must never enable with the removed device'
    )
    await s.connect('creator', 'removed')
    s.startDataSync('creator', 'removed')

    // The creator learns of the removal — through the removed device itself
    // — via auth sync alone
    await pTimeout(
      (async () => {
        while (true) {
          const member = await s
            .project('creator')
            .$member.getById(s.deviceId('removed'))
          if (member.role.roleId === BLOCKED_ROLE_ID) return
          await delay(200)
        }
      })(),
      {
        milliseconds: 30_000,
        message:
          'creator should learn the device was blocked via auth sync alone',
      }
    )

    // Allow any (incorrectly) enabled replication time to move blocks
    await delay(2_000)

    assertDataNeverEnabled()
    await s.assertNeverReceived('removed', [
      ...creatorSeed.preset,
      ...creatorSeed.observation,
    ])
    await s.assertNeverReceived('creator', removedSeed.observation)
  }
)

test(
  'a blocked device syncs nothing but auth',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: {
        creator: {},
        member: { role: COORDINATOR_ROLE_ID },
        blocked: { role: BLOCKED_ROLE_ID },
      },
    })

    assert.equal(
      (await s.project('creator').$member.getById(s.deviceId('blocked'))).role
        .roleId,
      BLOCKED_ROLE_ID,
      'creator sees blocked participant as part of the project'
    )

    const memberSeed = await s.seed('member', {
      observation: 30,
      preset: 3,
      field: 3,
    })
    s.startDataSync()
    await s.waitForSync('all', ['creator', 'member'])

    // The non-blocked devices converge on everything…
    await s.assertDocsConverged(['creator', 'member'], 'observation', {
      expected: memberSeed.observation,
    })
    await s.assertDocsConverged(['creator', 'member'], 'preset', {
      expected: memberSeed.preset,
    })

    // …while the blocked device receives none of it, config included
    await delay(2_000)
    await s.assertNeverReceived('blocked', [
      ...memberSeed.observation,
      ...memberSeed.preset,
    ])

    // But the blocked device did sync auth: it knows about its own role,
    // which lives in the creator's auth core
    assert.equal(
      (await s.project('blocked').$getOwnRole()).roleId,
      BLOCKED_ROLE_ID,
      'the blocked device learned its role via auth sync'
    )

    // The blocked device's cores ARE still added: blocking revokes what the
    // device may *receive*, not the project's claim on the data it
    // contributed before the block
    for (const ns of NAMESPACES) {
      assert.equal(
        s.project('creator')[kCoreManager].getCores(ns).length,
        3,
        `creator added the blocked device's ${ns} core`
      )
    }
  }
)

test(
  "a blocked device's pre-block data keeps propagating to new devices",
  { timeout: 120_000 },
  async (t) => {
    // Blocking revokes a device's ability to *receive* project data; the
    // data it contributed before the block remains project data. A device
    // that joins after the block — and never meets the blocked device —
    // must still receive that data, relayed by the remaining members.
    const s = await createSyncScenario(t, {
      devices: { creator: {}, member: {} },
    })
    const memberSeed = await s.seed('member', { observation: 30 })
    s.startDataSync()
    await s.waitForSync('all')

    await s.assignRole('creator', 'member', BLOCKED_ROLE_ID)
    await s.disconnect('member')

    // A fresh device joins via the creator only (scenario helpers all run
    // on one project, so drive the join directly). Named uniquely —
    // createManagers() seeds identities by index, which would collide with
    // the scenario's first device.
    const { createManager, invite, connectPeers } = await import('./utils.js')
    const joiner = createManager('blocked-data-joiner', t)
    await joiner.setDeviceInfo({
      name: 'blocked-data-joiner',
      deviceType: 'mobile',
    })
    const disconnectJoiner = connectPeers([s.manager('creator'), joiner])
    t.after(disconnectJoiner)
    await invite({
      invitor: s.manager('creator'),
      invitees: [joiner],
      projectId: s.projectId,
    })
    const joinerProject = await joiner.getProject(s.projectId)
    joinerProject.$sync.start()
    await joinerProject.$sync.waitForSync('all', { timeoutMs: 60_000 })

    const joinerObservations = await joinerProject.observation.getMany()
    assert.equal(
      joinerObservations.length,
      memberSeed.observation.length,
      "joiner received the blocked device's pre-block observations via the creator"
    )
  }
)

test(
  'role downgrade (member → blocked) stops replication on the same session',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { coordinator: {}, member: {} },
    })

    // Steady state with real data, both devices actively syncing
    await s.seed('coordinator', { observation: 40 })
    s.startDataSync()
    await s.waitForSync('all')

    const coordinatorSync = s.project('coordinator').$sync
    const memberDeviceId = s.deviceId('member')
    assert(
      coordinatorSync.getState().devices[memberDeviceId]?.data.isSyncEnabled,
      'member is data-enabled pre-block'
    )

    await s.assignRole('coordinator', 'member', BLOCKED_ROLE_ID)

    // The capability change must gate replication on the live session — no
    // reconnect required
    await s.waitForSyncState(
      'coordinator',
      ({ devices }) => !devices[memberDeviceId]?.data.isSyncEnabled,
      { message: 'data sync was not disabled after the block' }
    )

    const postBlockSeed = await s.seed('coordinator', { observation: 1 })
    await delay(2_000)
    await s.assertNeverReceived('member', postBlockSeed.observation)
  }
)

test(
  'blocking one member does not disturb sync between the others',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { coordinator: {}, member: {}, blocked: {} },
    })

    await s.seed('coordinator', { observation: 10 })
    s.startDataSync()
    await s.waitForSync('all')

    await s.assignRole('coordinator', 'blocked', BLOCKED_ROLE_ID)

    // Wait for the block to propagate to the *other* member, which must
    // gate its own replication with the blocked device
    const blockedDeviceId = s.deviceId('blocked')
    await s.waitForSyncState(
      'member',
      ({ devices }) => !devices[blockedDeviceId]?.data.isSyncEnabled,
      { message: 'block did not propagate to the other member' }
    )

    // New data still flows coordinator ↔ member, and never to blocked
    const postBlockSeed = await s.seed('member', { observation: 5 })
    await s.waitForSync('all', ['coordinator', 'member'])
    await s.assertDocsConverged(['coordinator', 'member'], 'observation')
    await delay(2_000)
    await s.assertNeverReceived('blocked', postBlockSeed.observation)
  }
)

test(
  'unblocking on a live session resumes data sync without a reconnect',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { coordinator: {}, member: {} },
    })

    await s.seed('coordinator', { observation: 10 })
    s.startDataSync()
    await s.waitForSync('all')

    const memberDeviceId = s.deviceId('member')

    await s.assignRole('coordinator', 'member', BLOCKED_ROLE_ID)
    await s.waitForSyncState(
      'coordinator',
      ({ devices }) => !devices[memberDeviceId]?.data.isSyncEnabled,
      { message: 'member was not gated after block' }
    )

    // Re-grant MEMBER on the same session
    await s.assignRole('coordinator', 'member', MEMBER_ROLE_ID)
    await s.waitForSyncState(
      'coordinator',
      ({ devices }) => devices[memberDeviceId]?.data.isSyncEnabled === true,
      { message: 'data sync did not resume after unblock' }
    )

    // Data written after the unblock flows without a reconnect
    const postUnblockSeed = await s.seed('coordinator', { observation: 1 })
    const memberProject = s.project('member')
    const doc = postUnblockSeed.observation[0]
    const deadline = Date.now() + 20_000
    /** @type {unknown} */ let received = null
    while (Date.now() < deadline) {
      received = await memberProject.observation
        .getByDocId(doc.docId)
        .catch(() => null)
      if (received) break
      await delay(200)
    }
    assert(received, 'doc created after unblock reached the member')
  }
)

test(
  'a blocked device keeps receiving auth, so it learns it was blocked',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: {
        creator: {},
        blockee: {},
        other: { role: COORDINATOR_ROLE_ID },
      },
    })
    s.startDataSync()
    await s.waitForSync('all')

    await s.assignRole('creator', 'blockee', BLOCKED_ROLE_ID)

    // The blockee must learn of its own block on the live session — auth
    // replication with a blocked peer stays enabled precisely for this
    await pTimeout(
      (async () => {
        while (true) {
          const role = await s.project('blockee').$getOwnRole()
          if (role.roleId === BLOCKED_ROLE_ID) return
          await delay(200)
        }
      })(),
      {
        milliseconds: 30_000,
        message: 'blockee never learned it was blocked',
      }
    )

    // Unrelated auth writes (new role records from another coordinator)
    // must not disturb the blocked peer's auth channel
    for (let i = 0; i < 5; i++) {
      const dummyDeviceId = Buffer.from(
        `unrelated-${i}`.padEnd(32, '0').slice(0, 32)
      ).toString('hex')
      await s.project('other').$member.assignRole(dummyDeviceId, MEMBER_ROLE_ID)
    }
    await delay(2_000)

    const blockeeDeviceId = s.deviceId('blockee')
    const creatorView = s.project('creator').$sync.getState().devices[
      blockeeDeviceId
    ]
    assert(creatorView, 'blocked device is still a connected sync peer')
    assert.equal(
      creatorView.initial.isSyncEnabled,
      true,
      'auth replication with the blocked device is still enabled'
    )

    // And the blockee still receives auth updates: a role record written
    // AFTER its block still reaches it
    const lateDummyId = Buffer.from(
      'late-role-record'.padEnd(32, '0').slice(0, 32)
    ).toString('hex')
    await s.project('creator').$member.assignRole(lateDummyId, MEMBER_ROLE_ID)
    await pTimeout(
      (async () => {
        while (true) {
          const member = await s
            .project('blockee')
            .$member.getById(lateDummyId)
            .catch(() => null)
          if (member?.role.roleId === MEMBER_ROLE_ID) return
          await delay(200)
        }
      })(),
      {
        milliseconds: 30_000,
        message: 'blockee stopped receiving auth records after being blocked',
      }
    )
  }
)
