import test from 'node:test'
import assert from 'node:assert/strict'
import { generate } from '@mapeo/mock-data'
import { setTimeout as delay } from 'node:timers/promises'
import { valueOf } from '../src/utils.js'
import { BLOCKED_ROLE_ID, MEMBER_ROLE_ID } from '../src/roles.js'
import { kCoreManager, kCoreOwnership } from '../src/mapeo-project.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'
import { connectProjectsControllably } from './controllable-wire.js'

// Permission / capability sync coverage and bug reproductions.
//
// Companion to docs/sync-review.md "Theme C — Permissions / capability" and
// the related test gaps P0.7, P0.8, P0.9.
//
// Reference: test-e2e/role-update-sync-capability.js already covers the
// 2-peer member -> blocked downgrade stopping replication on the same
// session. The tests here extend that to:
//   - [P0.7]  three-peer block isolation (PASSING coverage)
//   - [P0.8]  unblock-on-a-live-session resumes data sync (PASSING coverage)
//   - [BUG C1] a blocked peer never learns it was blocked once an unrelated
//             auth write re-caches its capability to 'blocked' (todo)
//   - [BUG C2] a blocked peer's non-auth cores are still added to the local
//             CoreManager (todo)
//
// The auth namespace carries 'coreOwnership' and 'role' docs
// (constants.js NAMESPACE_SCHEMAS.auth = ['coreOwnership', 'role']). So any
// role assignment by any peer is an "auth write" that propagates to everyone
// still replicating auth.

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
  '[BUG C1] a peer blocked while offline still learns it was blocked after reconnecting',
  {
    timeout: 90_000,
    todo:
      'BUG C1: on (re)connection a fresh PeerSyncController re-caches auth capability via ' +
      '#handleStateChange -> #readAndCacheSyncCapability, which has no auth-preservation ' +
      '(unlike #refreshSyncCapability). It sets auth="blocked" as soon as the peer\'s auth ' +
      'syncs, disabling auth replication before the peer can pull its own BLOCKED role doc, ' +
      'so the peer never learns it was blocked. peer-sync-controller.js #handleStateChange / ' +
      '#readAndCacheSyncCapability',
  },
  async (t) => {
    // A = coordinator/creator, B = member.
    const [managerA, managerB] = await createManagers(2, t)
    const disconnectInvite = connectPeers([managerA, managerB])
    const projectId = await managerA.createProject({ name: 'c1-learns-block' })
    await invite({
      invitor: managerA,
      invitees: [managerB],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })
    await disconnectInvite()

    const aProject = await managerA.getProject(projectId)
    const bProject = await managerB.getProject(projectId)

    assert.equal(
      (await bProject.$getOwnRole()).roleId,
      MEMBER_ROLE_ID,
      'B starts as MEMBER'
    )

    // Block B while it is disconnected. A indexes the BLOCKED role doc locally;
    // B has not seen it.
    await aProject.$member.assignRole(managerB.deviceId, BLOCKED_ROLE_ID)

    // Reconnect over a HIGH-LATENCY wire. On reconnect A spins up a fresh
    // PeerSyncController for B whose auth capability is re-cached via
    // #handleStateChange (the non-auth-preserving path), which sets
    // auth='blocked' and unreplicates the auth core from B.
    //
    // REPRODUCTION STATUS: this does NOT deterministically fail today, so the
    // test currently PASSES (ok # TODO) as a best-effort regression guard for
    // the structural fix. Latency cannot win the race: A serves B the BLOCKED
    // block on B's *request* (one latency in), whereas A's capability
    // re-evaluation that disables auth is delayed behind the 200ms SyncState
    // throttle — so B reliably receives its own BLOCKED role before A acts on
    // the stale capability. Forcing the C1 defect deterministically needs
    // finer fault injection than a byte-level wire (e.g. dropping the specific
    // auth block while delivering a later unrelated auth update) or the
    // server-websocket path. The fix (move auth-preservation into
    // #readAndCacheSyncCapability, or set BLOCKED_ROLE.sync.auth='allowed')
    // makes auth survive the re-cache regardless of timing.
    const link = connectProjectsControllably(aProject, bProject, {
      latencyMs: 300,
    })
    t.after(() => link.destroy())
    aProject.$sync.start()
    bProject.$sync.start()

    // The contract: blocking a peer must eventually inform that peer. Poll B's
    // own role. Under the bug B never learns (auth disabled) and this times out.
    const deadline = Date.now() + 20_000
    let bRoleId = MEMBER_ROLE_ID
    while (Date.now() < deadline) {
      bRoleId = (await bProject.$getOwnRole()).roleId
      if (bRoleId === BLOCKED_ROLE_ID) break
      await delay(250)
    }

    assert.equal(
      bRoleId,
      BLOCKED_ROLE_ID,
      'B learned it was blocked after reconnecting (auth kept replicating)'
    )
  }
)

test(
  '[BUG C2] a blocked peer’s non-auth cores are not added to the local CoreManager',
  {
    timeout: 120_000,
    todo:
      'BUG C2: sync-api #validateRoleAndAddCoresForPeer only short-circuits on ' +
      "NO_ROLE_ID, so a BLOCKED peer's config/data/blobIndex/blob cores are still " +
      'addCore()-ed locally. It should gate on capability (sync[ns] !== "blocked").',
  },
  async (t) => {
    // Invite B directly as BLOCKED so its non-auth cores are never legitimately
    // added before the block (timing-independent repro).
    const [managerA, managerB] = await createManagers(2, t)
    const disconnect = connectPeers([managerA, managerB])
    t.after(disconnect)

    const projectId = await managerA.createProject({ name: 'c2-blocked-cores' })
    await invite({
      invitor: managerA,
      invitees: [managerB],
      projectId,
      roleId: BLOCKED_ROLE_ID,
    })

    const aProject = await managerA.getProject(projectId)
    const bProject = await managerB.getProject(projectId)

    aProject.$sync.start()
    bProject.$sync.start()

    // Let auth (coreOwnership + role) propagate so A learns about B and runs
    // #validateRoleAndAddCoresForPeer for B. We can't waitForSync('full') here
    // because B is blocked, so wait for A to have B's coreOwnership doc.
    const bCoreOwnership = aProject[kCoreOwnership]
    const deadline = Date.now() + 30_000
    /** @type {null | string} */ let bDataCoreId = null
    while (Date.now() < deadline) {
      try {
        bDataCoreId = await bCoreOwnership.getCoreId(managerB.deviceId, 'data')
        if (bDataCoreId) break
      } catch {
        // not yet synced
      }
      await delay(200)
    }
    assert(
      bDataCoreId,
      "A synced B's coreOwnership doc (knows B's data coreId)"
    )

    const bConfigCoreId = await bCoreOwnership.getCoreId(
      managerB.deviceId,
      'config'
    )
    const bBlobIndexCoreId = await bCoreOwnership.getCoreId(
      managerB.deviceId,
      'blobIndex'
    )

    // Give #validateRoleAndAddCoresForPeer a beat to (incorrectly) add cores.
    await delay(2_000)

    const coreManager = aProject[kCoreManager]
    const dataKeys = coreManager
      .getCores('data')
      .map((r) => r.key.toString('hex'))
    const configKeys = coreManager
      .getCores('config')
      .map((r) => r.key.toString('hex'))
    const blobIndexKeys = coreManager
      .getCores('blobIndex')
      .map((r) => r.key.toString('hex'))

    assert.equal(
      dataKeys.includes(bDataCoreId),
      false,
      "A's CoreManager did NOT add blocked peer B's data core"
    )
    assert.equal(
      configKeys.includes(bConfigCoreId),
      false,
      "A's CoreManager did NOT add blocked peer B's config core"
    )
    assert.equal(
      blobIndexKeys.includes(bBlobIndexCoreId),
      false,
      "A's CoreManager did NOT add blocked peer B's blobIndex core"
    )
  }
)
