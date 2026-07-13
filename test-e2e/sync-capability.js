import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'timers/promises'
import pTimeout from 'p-timeout'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { BLOCKED_ROLE_ID, COORDINATOR_ROLE_ID } from '../src/roles.js'

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
    const managers = await createManagers(3, t)
    const [creator, coordinator, removed] = managers

    // 1. All three devices join the project and fully sync, so everyone has
    // replicas of everyone's auth cores
    const disconnect1 = connectPeers(managers)
    const projectId = await creator.createProject({ name: 'Mapeo' })
    await invite({
      invitor: creator,
      invitees: [coordinator],
      projectId,
      roleId: COORDINATOR_ROLE_ID,
    })
    await invite({ invitor: creator, invitees: [removed], projectId })

    const [creatorProject, coordinatorProject, removedProject] =
      await Promise.all(managers.map((m) => m.getProject(projectId)))

    await waitForSync(
      [creatorProject, coordinatorProject, removedProject],
      'initial'
    )
    await disconnect1()

    // 2. The coordinator blocks the "removed" device while the creator is
    // offline. The removed device receives its own block record (it lives in
    // the coordinator's auth core).
    const disconnect2 = connectPeers([coordinator, removed])
    await coordinatorProject.$member.assignRole(
      removed.deviceId,
      BLOCKED_ROLE_ID
    )
    await waitForSync([coordinatorProject, removedProject], 'initial')
    await disconnect2()

    assert.equal(
      (await removedProject.$member.getById(removed.deviceId)).role.roleId,
      BLOCKED_ROLE_ID,
      'test setup: removed device has received its own block record'
    )
    assert.notEqual(
      (await creatorProject.$member.getById(removed.deviceId)).role.roleId,
      BLOCKED_ROLE_ID,
      'test setup: creator still holds a stale (not-blocked) role record'
    )

    // 3. While still apart, the creator writes new config and data, and the
    // removed device writes new data. None of this may ever cross between
    // them.
    const creatorPreset = await creatorProject.preset.create(
      valueOf(generate('preset')[0])
    )
    const creatorObservation = await creatorProject.observation.create(
      valueOf(generate('observation')[0])
    )
    const removedObservation = await removedProject.observation.create(
      valueOf(generate('observation')[0])
    )

    // 4. The creator meets only the removed device. The removed device
    // honestly relays the coordinator's auth core, which contains the block
    // record. Both sides enable data sync — the worst case for the stale
    // record.
    /** @type {string[]} */
    const violations = []
    creatorProject.$sync.on('sync-state', (state) => {
      const removedDeviceState = state.devices[removed.deviceId]
      if (removedDeviceState?.data.isSyncEnabled) {
        violations.push('data sync enabled with removed device')
      }
    })

    const disconnect3 = connectPeers([creator, removed])
    t.after(disconnect3)
    creatorProject.$sync.start()
    removedProject.$sync.start()

    // 5. The creator learns of the removal — through the removed device
    // itself — via auth sync alone.
    await pTimeout(
      (async () => {
        while (true) {
          const member = await creatorProject.$member.getById(removed.deviceId)
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

    assert.deepEqual(violations, [], 'data sync was never enabled')
    await assert.rejects(
      () => removedProject.preset.getByDocId(creatorPreset.docId),
      'config written after the removal never reaches the removed device'
    )
    await assert.rejects(
      () => creatorProject.observation.getByDocId(removedObservation.docId),
      "the removed device's data never reaches the creator"
    )
    await assert.rejects(
      () => removedProject.observation.getByDocId(creatorObservation.docId),
      "the creator's data never reaches the removed device"
    )
  }
)
