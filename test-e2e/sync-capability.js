import test from 'node:test'
import assert from 'node:assert/strict'
import { generate } from '@mapeo/mock-data'
import { setTimeout as delay } from 'node:timers/promises'
import { valueOf } from '../src/utils.js'
import {
  BLOCKED_ROLE_ID,
  MEMBER_ROLE_ID,
  COORDINATOR_ROLE_ID,
} from '../src/roles.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'
import { connectProjectsControllably } from './controllable-wire.js'

// Permission / capability sync coverage and bug reproductions.
//
// Companion to the PR description "Theme C — Permissions / capability" and
// the related test gaps P0.7, P0.8, P0.9.
//
// Reference: test-e2e/role-update-sync-capability.js already covers the
// 2-peer member -> blocked downgrade stopping replication on the same
// session. The tests here extend that to:
//   - [P0.7]  three-peer block isolation (PASSING coverage)
//   - [P0.8]  unblock-on-a-live-session resumes data sync (PASSING coverage)
//   - [BUG C1] a blocked peer never learns it was blocked once an unrelated
//             auth write re-caches its capability to 'blocked' (FAILS)
//   - [BUG G1] a stale role record lets config/data replicate with a removed
//             device before its removal record has been synced (FAILS)
//
// The auth namespace carries 'coreOwnership' and 'role' docs
// (constants.js NAMESPACE_SCHEMAS.auth = ['coreOwnership', 'role']). So any
// role assignment by any peer is an "auth write" that propagates to everyone
// still replicating auth.

/**
 * Poll `condition` until it returns truthy or `timeout` ms elapse.
 * @param {() => boolean | Promise<boolean>} condition
 * @param {number} [timeout]
 * @returns {Promise<boolean>} whether the condition became true
 */
async function waitFor(condition, timeout = 30_000) {
  const start = Date.now()
  for (;;) {
    if (await condition()) return true
    if (Date.now() - start > timeout) return false
    await delay(100)
  }
}

/**
 * Resolve once `predicate(state)` is true for the given project's sync state,
 * or reject after `timeout` ms.
 *
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @param {(state: import('../src/sync/sync-api.js').State) => boolean} predicate
 * @param {{ timeout?: number, message?: string }} [opts]
 */
function waitForSyncState(
  project,
  predicate,
  { timeout = 30_000, message } = {}
) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => {
      project.$sync.off('sync-state', onState)
      rej(new Error(message || 'sync-state predicate not met in time'))
    }, timeout)
    /** @param {import('../src/sync/sync-api.js').State} state */
    const onState = (state) => {
      if (!predicate(state)) return
      clearTimeout(timer)
      project.$sync.off('sync-state', onState)
      res(void 0)
    }
    project.$sync.on('sync-state', onState)
    onState(project.$sync.getState())
  })
}

test(
  '[P0.7] three-peer block isolation: blocked member stops receiving a third member’s new data',
  { timeout: 120_000 },
  async (t) => {
    // A = creator/coordinator, B and C = members.
    const [managerA, managerB, managerC] = await createManagers(3, t)
    const disconnect = connectPeers([managerA, managerB, managerC])
    t.after(disconnect)

    const projectId = await managerA.createProject({ name: 'block-isolation' })
    await invite({
      invitor: managerA,
      invitees: [managerB, managerC],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const aProject = await managerA.getProject(projectId)
    const bProject = await managerB.getProject(projectId)
    const cProject = await managerC.getProject(projectId)

    for (const o of generate('observation', { count: 10 })) {
      await aProject.observation.create(valueOf(o))
    }

    aProject.$sync.start()
    bProject.$sync.start()
    cProject.$sync.start()
    await waitForSync([aProject, bProject, cProject], 'full', {
      timeout: 60_000,
    })

    // Block C from the coordinator.
    await aProject.$member.assignRole(managerC.deviceId, BLOCKED_ROLE_ID)

    // Wait until the block has propagated to B: B must see C as no longer
    // data-enabled (B has learned C's BLOCKED role and gated its sync).
    await waitForSyncState(
      bProject,
      (state) =>
        state.remoteDeviceSyncState[managerC.deviceId]?.data.isSyncEnabled ===
        false,
      {
        timeout: 60_000,
        message: 'block did not propagate to B (B still sees C data-enabled)',
      }
    )

    // Now create a NEW observation on B. C must not receive it: B should gate
    // its data namespace for the blocked peer C.
    const postBlockDoc = await bProject.observation.create(
      valueOf(generate('observation')[0])
    )

    // Poll for ~2s; the doc must never appear on C.
    const deadline = Date.now() + 2_000
    let cReceived = null
    while (Date.now() < deadline) {
      cReceived = await cProject.observation.getByDocId(postBlockDoc.docId, {
        mustBeFound: false,
      })
      if (cReceived) break
      await delay(200)
    }

    assert.equal(
      cReceived,
      null,
      'blocked peer C did not receive a new observation created on B after the block propagated'
    )
  }
)

test(
  '[P0.8] unblocking a peer on a live session resumes data sync without reconnect',
  { timeout: 120_000 },
  async (t) => {
    const [managerA, managerB] = await createManagers(2, t)
    const disconnect = connectPeers([managerA, managerB])
    t.after(disconnect)

    const projectId = await managerA.createProject({ name: 'unblock-live' })
    await invite({
      invitor: managerA,
      invitees: [managerB],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const aProject = await managerA.getProject(projectId)
    const bProject = await managerB.getProject(projectId)

    for (const o of generate('observation', { count: 10 })) {
      await aProject.observation.create(valueOf(o))
    }

    aProject.$sync.start()
    bProject.$sync.start()
    await waitForSync([aProject, bProject], 'full', { timeout: 60_000 })

    // Sanity: A sees B as data-enabled before the block.
    assert(
      aProject.$sync.getState().remoteDeviceSyncState[managerB.deviceId]?.data
        .isSyncEnabled,
      'A sees B data-enabled pre-block'
    )

    // Block B, then wait for A to gate B's data.
    await aProject.$member.assignRole(managerB.deviceId, BLOCKED_ROLE_ID)
    await waitForSyncState(
      aProject,
      (state) =>
        state.remoteDeviceSyncState[managerB.deviceId]?.data.isSyncEnabled ===
        false,
      { timeout: 60_000, message: 'A did not gate B data after block' }
    )

    // Unblock on the SAME live session (no disconnect): re-grant MEMBER.
    await aProject.$member.assignRole(managerB.deviceId, MEMBER_ROLE_ID)
    await waitForSyncState(
      aProject,
      (state) =>
        state.remoteDeviceSyncState[managerB.deviceId]?.data.isSyncEnabled ===
        true,
      {
        timeout: 60_000,
        message: 'A did not re-enable B data after unblock on the same session',
      }
    )

    // A doc created after the unblock must reach B without reconnecting.
    const postUnblockDoc = await aProject.observation.create(
      valueOf(generate('observation')[0])
    )

    const deadline = Date.now() + 20_000
    let bReceived = null
    while (Date.now() < deadline) {
      bReceived = await bProject.observation.getByDocId(postUnblockDoc.docId, {
        mustBeFound: false,
      })
      if (bReceived) break
      await delay(200)
    }

    assert(
      bReceived,
      'doc created after unblock reached B on the same session (no reconnect)'
    )
  }
)

test(
  '[BUG C1] unrelated auth traffic disables auth for a blocked peer, so it can never learn it was blocked',
  {
    timeout: 90_000,
  },
  async (t) => {
    // A = coordinator/creator, B = member (blocked), C = coordinator (source of
    // an unrelated auth write). syncThrottleMs: 0 removes the 200ms SyncState
    // throttle so A's capability re-evaluation is immediate.
    //
    // DETERMINISTIC CONSTRUCTION (avoids the handshake/serve race): we hold the
    // A->B link on an ALREADY-ESTABLISHED connection, block B (the BLOCKED doc
    // is queued but held by the gate), then make coordinator C write an
    // unrelated auth (role) doc that A downloads over a separate open link.
    // Downloading it blips A's auth localState.want >0 then 0, so A's
    // syncStatus for B's auth transitions synced->syncing->synced -> A's
    // PeerSyncController #handleStateChange fires didUpdate.auth ->
    // #readAndCacheSyncCapability (which, unlike #refreshSyncCapability, does
    // NOT preserve auth) sets auth='blocked' and unreplicates the auth core
    // from B. When we then release the A->B link, the auth channel is gone, so
    // B never receives its BLOCKED role and never learns it was blocked.
    const [managerA, managerB, managerC] = await createManagers(
      3,
      t,
      undefined,
      { syncThrottleMs: 0 }
    )
    const disconnectInvite = connectPeers([managerA, managerB, managerC])
    const projectId = await managerA.createProject({ name: 'c1-learns-block' })
    await invite({
      invitor: managerA,
      invitees: [managerB],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })
    await invite({
      invitor: managerA,
      invitees: [managerC],
      projectId,
      roleId: COORDINATOR_ROLE_ID,
    })
    await disconnectInvite()

    const aProject = await managerA.getProject(projectId)
    const bProject = await managerB.getProject(projectId)
    const cProject = await managerC.getProject(projectId)

    // A<->B over a gated wire; A<->C over a SLOW wire. The latency on A<->C is
    // deliberate: it keeps A's auth localState.want > 0 long enough while A
    // downloads C's unrelated doc that the syncStatus 'syncing' state is
    // actually observed, so A's PeerSyncController sees the auth
    // synced->syncing->synced transition that fires #handleStateChange's
    // capability re-read. Over an instant link the blip happens within one tick
    // and the transition is missed.
    const linkAB = connectProjectsControllably(aProject, bProject)
    const linkAC = connectProjectsControllably(aProject, cProject, {
      latencyMs: 300,
    })
    t.after(() => Promise.all([linkAB.destroy(), linkAC.destroy()]))

    aProject.$sync.start()
    bProject.$sync.start()
    cProject.$sync.start()

    // Fully presync-sync A with both peers first (waitForSync over [A,B]
    // resolves once A is synced with all its peers — B and C — and B with A;
    // B and C are not interconnected).
    await waitForSync([aProject, bProject], 'initial', { timeout: 30_000 })
    assert.equal(
      (await bProject.$getOwnRole()).roleId,
      MEMBER_ROLE_ID,
      'B is a synced MEMBER before the block'
    )

    /** @param {string} deviceId */
    const authEnabledFor = (deviceId) =>
      aProject.$sync.getState().remoteDeviceSyncState[deviceId]?.initial
        .isSyncEnabled === true

    // Block B. The workaround (#handleRolesUpdate -> #refreshSyncCapability)
    // preserves auth='allowed', so A keeps replicating auth to B — which is what
    // lets a blocked peer learn it was blocked. (A blocked peer that is gated on
    // every namespace is dropped from remoteDeviceSyncState entirely; auth being
    // enabled is what keeps B present.)
    await aProject.$member.assignRole(managerB.deviceId, BLOCKED_ROLE_ID)
    const enabledAfterBlock = await waitFor(
      () => authEnabledFor(managerB.deviceId),
      10_000
    )
    assert(
      enabledAfterBlock,
      'precondition: A keeps auth enabled for B right after blocking it'
    )

    // Unrelated auth writes from coordinator C. The slow A<->C link keeps A's
    // auth want > 0 long enough that A observes the auth synced->syncing->synced
    // transition for B, firing #handleStateChange's capability re-read.
    for (let i = 0; i < 5; i++) {
      const dummyDeviceId = Buffer.from(
        `c1-unrelated-${i}`.padEnd(32, '0').slice(0, 32)
      ).toString('hex')
      await cProject.$member.assignRole(dummyDeviceId, MEMBER_ROLE_ID)
    }

    // BUG: that re-read goes through #readAndCacheSyncCapability, which (unlike
    // #refreshSyncCapability) does NOT preserve auth — so A overwrites B's auth
    // capability to 'blocked', disables auth replication, and drops B from sync
    // state. A blocked peer can then never learn it was blocked. The invariant
    // (auth stays enabled for a blocked peer) must hold; it does today only
    // until an unrelated auth update re-caches the capability.
    const authDisabled = await waitFor(
      () => !authEnabledFor(managerB.deviceId),
      15_000
    )
    assert.equal(
      authDisabled,
      false,
      'A must keep auth enabled for the blocked peer B after unrelated auth ' +
        'traffic re-caches its capability (else B can never learn it was blocked)'
    )
  }
)

test(
  '[BUG G1] a device with a stale role record must not sync config/data with a removed device',
  { timeout: 120_000 },
  async (t) => {
    // Roles and membership live in the auth namespace, but config/blobIndex
    // replicate with a peer IMMEDIATELY on connection, and data as soon as
    // presync completes — all gated on the LOCAL, possibly-stale role record
    // for that peer. So a device that was removed from the project while we
    // were offline (we hold a stale "member" record for it) receives our
    // config — and can receive data — before we finish syncing the auth
    // records that would tell us it was removed. Nothing beyond auth should
    // replicate until auth sync with the peer completes and the role records
    // it carried have taken effect.
    // syncThrottleMs: 0 removes the 200ms sync-state throttle, so the
    // capability re-read fires as soon as auth blocks finish downloading —
    // BEFORE the indexer has processed the role records they carry. The bulk
    // of dummy role records below keeps the indexer busy long enough for the
    // stale-capability window to be reliably observable.
    const [creator, coordinator, removed] = await createManagers(
      3,
      t,
      undefined,
      { syncThrottleMs: 0 }
    )

    // 1. All three join and fully presync, so everyone has replicas of
    // everyone's auth cores
    const disconnect1 = connectPeers([creator, coordinator, removed])
    const projectId = await creator.createProject({ name: 'stale-role' })
    await invite({
      invitor: creator,
      invitees: [coordinator],
      projectId,
      roleId: COORDINATOR_ROLE_ID,
    })
    await invite({
      invitor: creator,
      invitees: [removed],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })
    const [creatorProject, coordinatorProject, removedProject] =
      await Promise.all(
        [creator, coordinator, removed].map((m) => m.getProject(projectId))
      )
    await waitForSync(
      [creatorProject, coordinatorProject, removedProject],
      'initial'
    )
    await disconnect1()

    // 2. The coordinator blocks the "removed" device while the creator is
    // offline; the removed device receives its own block record (it lives in
    // the coordinator's auth core). The creator's record stays stale.
    const disconnect2 = connectPeers([coordinator, removed])
    // A realistic volume of other auth records written in the same offline
    // period (e.g. a coordinator managing many devices). These arrive in the
    // same auth sync as the block record and take time to index.
    for (let i = 0; i < 150; i++) {
      const dummyDeviceId = Buffer.from(
        `stale-role-dummy-${i}`.padEnd(32, '0').slice(0, 32)
      ).toString('hex')
      await coordinatorProject.$member.assignRole(dummyDeviceId, MEMBER_ROLE_ID)
    }
    await coordinatorProject.$member.assignRole(
      removed.deviceId,
      BLOCKED_ROLE_ID
    )
    await waitForSync([coordinatorProject, removedProject], 'initial')
    await disconnect2()

    assert.equal(
      (await removedProject.$member.getById(removed.deviceId)).role.roleId,
      BLOCKED_ROLE_ID,
      'setup: removed device has received its own block record'
    )
    assert.notEqual(
      (await creatorProject.$member.getById(removed.deviceId)).role.roleId,
      BLOCKED_ROLE_ID,
      'setup: creator still holds a stale (not-blocked) role record'
    )

    // 3. While still apart, the creator writes new config
    const creatorPreset = await creatorProject.preset.create(
      valueOf(generate('preset')[0])
    )

    // 4. The creator meets ONLY the removed device. The removed device
    // honestly relays the coordinator's auth core containing the block
    // record. The creator must learn of the removal through auth sync alone,
    // and nothing beyond auth may replicate in the meantime.
    const disconnect3 = connectPeers([creator, removed])
    t.after(disconnect3)
    creatorProject.$sync.start()
    removedProject.$sync.start()

    // Wait until the creator has learned of the removal (via the relayed
    // record). Config replication starts immediately on connection, so by
    // the time the record has synced AND indexed, the preset has long since
    // leaked to the removed device.
    const deadline = Date.now() + 30_000
    for (;;) {
      const member = await creatorProject.$member.getById(removed.deviceId)
      if (member.role.roleId === BLOCKED_ROLE_ID) break
      assert(
        Date.now() < deadline,
        'creator should learn of the removal via auth sync alone'
      )
      await delay(200)
    }
    await delay(2_000)

    // FAILS today: the removed device received config written after its
    // removal, because config replicated on the stale role record before
    // auth sync completed
    const leaked = await removedProject.preset.getByDocId(creatorPreset.docId, {
      mustBeFound: false,
    })
    assert.equal(
      leaked,
      null,
      'config written after the removal must not reach the removed device'
    )
  }
)
