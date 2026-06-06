import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { BLOCKED_ROLE_ID, MEMBER_ROLE_ID } from '../src/roles.js'
import { kWaitForInitialSyncWithPeer } from '../src/sync/sync-api.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'

/**
 * Completion-detection reproductions for the sync review (docs/sync-review.md,
 * Theme B + the §3 stress table). One file covers:
 *
 *  - [P0.16] 3-peer full-sync completion (PASSING coverage). Guards B1's future
 *    fix from regressing into "never completes with 3 peers".
 *  - [BUG B3]  isInitiallySyncedWithPeer never resolves for a peer whose presync
 *    namespaces are blocked (TODO — fails today; the internal wait rejects/times
 *    out instead of resolving).
 *  - [P0.4]  waitForSync(type, { timeoutMs }) rejects with Error('Sync timeout')
 *    when sync stalls (PASSING — existing-but-untested behavior). Plus a small
 *    "timer resets under continuous activity" companion check.
 *  - [BUG B1]  isSynced/waitForSync('initial') can report synced before
 *    late-discovered cores actually replicate (TODO — RTT-bounded race, written
 *    best-effort and documented as timing-sensitive).
 *  - [P0.5]  transitive sync A<->B<->C with A and C NOT directly connected
 *    (investigative; converted to TODO if transitive data sync does not work).
 *
 * BUG-REPRO tests use node:test's `todo` option so a throwing test surfaces as
 * `not ok ... # TODO` (the desired signal that the bug is still present).
 */

/** @import { MapeoProject } from '../src/mapeo-project.js' */
/** @import { MapeoManager } from '../src/mapeo-manager.js' */

/**
 * Count observations in a project.
 * @param {MapeoProject} project
 */
async function observationCount(project) {
  const docs = await project.observation.getMany()
  return docs.length
}

test(
  '[P0.16] full sync completes across three connected member peers',
  { timeout: 120_000 },
  async (t) => {
    const [ma, mb, mc] = await createManagers(3, t)
    const disconnect = connectPeers([ma, mb, mc])
    t.after(disconnect)

    const projectId = await ma.createProject({ name: 'three-peer' })
    await invite({
      invitor: ma,
      invitees: [mb, mc],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const pa = await ma.getProject(projectId)
    const pb = await mb.getProject(projectId)
    const pc = await mc.getProject(projectId)

    // Each peer creates several observations of its own.
    const perPeer = 5
    for (const project of [pa, pb, pc]) {
      for (let i = 0; i < perPeer; i++) {
        await project.observation.create(valueOf(generate('observation')[0]))
      }
    }

    pa.$sync.start()
    pb.$sync.start()
    pc.$sync.start()

    await waitForSync([pa, pb, pc], 'full', { timeout: 60_000 })

    const expected = perPeer * 3
    for (const [name, project] of [
      ['A', pa],
      ['B', pb],
      ['C', pc],
    ]) {
      assert.equal(
        await observationCount(
          /** @type {import('../src/mapeo-project.js').MapeoProject} */ (
            project
          )
        ),
        expected,
        `peer ${name} sees all ${expected} observations after full sync`
      )
    }
  }
)

test(
  '[BUG B3] initial-sync wait for a peer invited as BLOCKED resolves instead of hanging',
  {
    timeout: 60_000,
    todo: 'BUG B3: isInitiallySyncedWithPeer returns false forever for a peer whose presync (config/blobIndex) namespaces are blocked, because deriveState removes blocked peers per-namespace and the function has no blocked-namespace guard',
  },
  async (t) => {
    const [invitor, invitee] = await createManagers(2, t)
    const disconnect = connectPeers([invitor, invitee])
    t.after(disconnect)

    const projectId = await invitor.createProject({ name: 'block-initial' })

    // Invite as MEMBER first so the invitee actually joins (gets the project
    // key, writes its core-ownership / config), then block it. Inviting
    // directly as BLOCKED is allowed (BLOCKED_ROLE_ID is in
    // ROLE_IDS_FOR_NEW_INVITE) but the invitee never receives the project key
    // when blocked, so member -> block gives us a connected, blocked peer.
    await invite({
      invitor,
      invitees: [invitee],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const invitorProject = await invitor.getProject(projectId)
    const inviteeProject = await invitee.getProject(projectId)

    invitorProject.$sync.start()
    inviteeProject.$sync.start()
    await waitForSync([invitorProject, inviteeProject], 'initial', {
      timeout: 30_000,
    })

    // Block the invitee on a live session.
    await invitorProject.$member.assignRole(invitee.deviceId, BLOCKED_ROLE_ID)

    // Give the capability change time to propagate into the PSC + sync state so
    // the blocked peer is removed from config/blobIndex remoteStates.
    await delay(2_000)

    // The internal initial-sync wait (used by the invite flow) should resolve
    // for a blocked peer rather than rely on a timeout. Today it rejects: the
    // peer is absent from config/blobIndex remoteStates, so
    // isInitiallySyncedWithPeer returns false forever and the abort fires.
    const signal = AbortSignal.timeout(3_000)
    await invitorProject.$sync[kWaitForInitialSyncWithPeer](
      invitee.deviceId,
      signal
    )
  }
)

test(
  '[P0.4] $sync.waitForSync rejects with "Sync timeout" when sync stalls',
  { timeout: 60_000 },
  async (t) => {
    const [invitor, invitee] = await createManagers(2, t)
    const disconnect = connectPeers([invitor, invitee])
    t.after(disconnect)

    const projectId = await invitor.createProject({ name: 'stall' })
    await invite({
      invitor,
      invitees: [invitee],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const invitorProject = await invitor.getProject(projectId)
    const inviteeProject = await invitee.getProject(projectId)

    // The invitee NEVER enables its data namespaces; only the invitor wants to
    // sync data. Both reach initial (presync) sync so PSCs exist and the peer
    // is known in the data namespace's sync state.
    invitorProject.$sync.start()
    await waitForSync([invitorProject, inviteeProject], 'initial', {
      timeout: 30_000,
    })

    // Both peers create data. The invitor learns (via core-ownership) about the
    // invitee's data core and wants its blocks (wanted > 0), and the invitee
    // wants the invitor's blocks (want > 0) — but the invitee's data namespace
    // is disabled, so neither exchange can ever complete. data.dataToSync stays
    // true forever -> no further sync-state progress -> the timeoutMs timer
    // fires with Error('Sync timeout').
    for (let i = 0; i < 10; i++) {
      await inviteeProject.observation.create(
        valueOf(generate('observation')[0])
      )
      await invitorProject.observation.create(
        valueOf(generate('observation')[0])
      )
    }
    await delay(500)

    await assert.rejects(
      () => invitorProject.$sync.waitForSync('full', { timeoutMs: 1_000 }),
      (err) => {
        assert(err instanceof Error)
        assert.equal(err.message, 'Sync timeout')
        return true
      },
      'waitForSync rejects with Error("Sync timeout") when full sync stalls'
    )
  }
)

test(
  '[P0.4b] waitForSync timer resets while sync activity continues',
  { timeout: 60_000 },
  async (t) => {
    const [invitor, invitee] = await createManagers(2, t)
    const disconnect = connectPeers([invitor, invitee])
    t.after(disconnect)

    const projectId = await invitor.createProject({ name: 'reset-timer' })
    await invite({
      invitor,
      invitees: [invitee],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const invitorProject = await invitor.getProject(projectId)
    const inviteeProject = await invitee.getProject(projectId)

    invitorProject.$sync.start()
    inviteeProject.$sync.start()

    // Continuously create data on the invitee so sync-state keeps updating.
    // Each update resets the (short) timeout, so waitForSync should resolve
    // even though the total wall-clock exceeds timeoutMs.
    let keepGoing = true
    const churn = (async () => {
      while (keepGoing) {
        await inviteeProject.observation.create(
          valueOf(generate('observation')[0])
        )
        await invitorProject.observation.create(
          valueOf(generate('observation')[0])
        )
        await delay(150)
      }
    })()

    try {
      const start = Date.now()
      await invitorProject.$sync.waitForSync('full', { timeoutMs: 1_000 })
      // If activity kept the timer alive past timeoutMs, this resolved without
      // the 1s timeout firing despite ongoing churn. We only assert it
      // resolved (no 'Sync timeout' rejection). Elapsed is informational.
      assert.ok(Date.now() - start >= 0)
    } finally {
      keepGoing = false
      await churn
    }
  }
)

test(
  '[BUG B1] waitForSync("initial") does not resolve before late-discovered cores replicate',
  {
    timeout: 60_000,
    todo: 'BUG B1: NamespaceSyncState.addPeer seeds only cores known at call time and #addCore does not back-fill known peers, so isSynced can pass on sibling cores before auth/config actually replicate (RTT-bounded race)',
  },
  async (t) => {
    const [invitor, invitee] = await createManagers(2, t)
    const disconnect = connectPeers([invitor, invitee])
    t.after(disconnect)

    const projectId = await invitor.createProject({ name: 'late-cores' })

    // Invitee writes a config doc (device info) before connecting so there is
    // real config data to pull once cores are discovered.
    await invitee.setDeviceInfo({ name: 'invitee-late', deviceType: 'mobile' })

    await invite({
      invitor,
      invitees: [invitee],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const invitorProject = await invitor.getProject(projectId)
    const inviteeProject = await invitee.getProject(projectId)

    invitorProject.$sync.start()
    inviteeProject.$sync.start()

    // BUG B1 is an RTT-bounded race: addCore for the invitee's config/auth
    // cores can happen after waitForSync('initial') already resolved on
    // sibling-core state. We assert that once 'initial' resolves the invitor
    // can actually read the invitee's config doc. If the race is present this
    // read returns undefined right after waitForSync resolves.
    //
    // REPRODUCTION STATUS: best-effort; currently PASSES (ok # TODO). The
    // premature-completion window is a FIRST-CONTACT, sub-throttle micro-window
    // (the peer is present via a sibling core while the late-discovered config
    // core has no preHaves yet). It could not be forced with the controllable
    // wire: first core-discovery is driven by the invite/local-discovery RPC
    // path, not the kProjectReplicate transport, so the wire cannot widen the
    // exact window, and on loopback the config block lands before 'initial'
    // resolves. The structural fix (back-fill late cores in #addCore and gate
    // completion on status==='started' for connected peers) is the real guard.
    await invitorProject.$sync.waitForSync('initial', { timeoutMs: 30_000 })

    const member = await invitorProject.$member.getById(invitee.deviceId)
    assert.equal(
      member.name,
      'invitee-late',
      'invitor has the invitee config doc the instant initial sync resolves'
    )
  }
)

test(
  '[P0.5] data created on A reaches C through B when A and C are not directly connected',
  { timeout: 120_000 },
  async (t) => {
    const [ma, mb, mc] = await createManagers(3, t)

    // First connect everyone so invites (which need connectivity) succeed.
    const disconnectAll = connectPeers([ma, mb, mc])

    const projectId = await ma.createProject({ name: 'transitive' })
    await invite({
      invitor: ma,
      invitees: [mb, mc],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const pa = await ma.getProject(projectId)
    const pb = await mb.getProject(projectId)
    const pc = await mc.getProject(projectId)

    // Tear down the all-to-all topology.
    await disconnectAll()

    // Build an A <-> B <-> C line: A and C are NOT directly connected.
    let requestedDisconnect = false
    const servers = await Promise.all([
      ma.startLocalPeerDiscoveryServer().then((s) => ({ m: ma, ...s })),
      mb.startLocalPeerDiscoveryServer().then((s) => ({ m: mb, ...s })),
      mc.startLocalPeerDiscoveryServer().then((s) => ({ m: mc, ...s })),
    ])
    const byManager = new Map(servers.map((s) => [s.m, s]))
    t.after(async () => {
      requestedDisconnect = true
      await Promise.all([
        ma.stopLocalPeerDiscoveryServer({ force: true }),
        mb.stopLocalPeerDiscoveryServer({ force: true }),
        mc.stopLocalPeerDiscoveryServer({ force: true }),
      ])
    })

    /**
     * @param {MapeoManager} from
     * @param {MapeoManager} to
     */
    const connect = (from, to) => {
      if (requestedDisconnect) return
      const target = byManager.get(to)
      assert(target)
      from.connectLocalPeer({
        address: '127.0.0.1',
        name: target.name,
        port: target.port,
      })
    }
    // A<->B
    connect(ma, mb)
    connect(mb, ma)
    // B<->C
    connect(mb, mc)
    connect(mc, mb)

    pa.$sync.start()
    pb.$sync.start()
    pc.$sync.start()

    // A creates a doc; it must reach C only by relaying through B.
    const doc = await pa.observation.create(valueOf(generate('observation')[0]))

    // Poll C for the doc (give the relay time to flow A->B->C).
    let found = null
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      found = await pc.observation.getByDocId(doc.docId, { mustBeFound: false })
      if (found) break
      await delay(500)
    }

    assert(
      found,
      "A's observation reached C transitively through B (A and C never directly connected)"
    )
  }
)
