import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import {
  connectPeers,
  createManagers,
  invite,
  seedDatabases,
  waitForPeers,
  waitForSync,
} from './utils.js'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { connectProjectsControllably } from './controllable-wire.js'

/**
 * Connection-lifecycle / reconnection repros for the sync subsystem.
 *
 * Companion to the PR description. Covers the disconnect/reconnect findings:
 *
 *   - [P0 reconnect]  data created while a peer is offline syncs after it
 *                     reconnects (3 peers). PASSING coverage of the core
 *                     multi-device disconnect/reconnect scenario.
 *   - [P0.11 / resume] disconnect mid-transfer then reconnect resumes to
 *                     completion. PASSING coverage; best-effort at hitting the
 *                     "mid-transfer" window (see comment on the test).
 *   - [BUG D1]        overlapping reconnect from the same device must keep that
 *                     device represented in sync state. FAILS (BUG D1). This one is
 *                     inherently TIMING-SENSITIVE: it needs the new connection's
 *                     peer-add to land before the stale connection's peer-remove
 *                     so the unconditional `#pscByPeerId.delete` +
 *                     `disconnectPeer` wipe the live entry. We cannot force that
 *                     window deterministically over local discovery, so the test
 *                     is written to RUN without harness errors and assert the
 *                     post-condition the D1 fix is meant to guarantee.
 *
 * P0.14 (server-websocket reconnect, D1 on the server path) is intentionally
 * NOT written here. It needs the full @comapeo/cloud server harness (see
 * test-e2e/server.js, which spins up a real Fastify server and uses
 * $member.addServerPeer). That repro belongs alongside the server e2e tests,
 * not in this local-discovery-only file. See the report.
 *
 * NOTE: reconnection over local discovery is timing-sensitive. The two
 * coverage tests assert eventual convergence (waitForSync) rather than exact
 * intermediate connection states, which is what makes them reliable.
 */

/**
 * Granular per-peer connect/disconnect over local discovery.
 *
 * `connectPeers` in utils.js connects/disconnects the whole group at once. To
 * disconnect a single peer while the others stay connected we manage each
 * manager's discovery server individually: stopping one manager's server with
 * `{ force: true }` drops its connections without touching the others, and we
 * can bring it back by restarting its server and re-dialing the rest.
 *
 * @param {ReadonlyArray<import('../src/mapeo-manager.js').MapeoManager>} managers
 */
function connectablePeers(managers) {
  /** @type {Map<import('../src/mapeo-manager.js').MapeoManager, { name: string, port: number }>} */
  const addresses = new Map()

  /** @param {import('../src/mapeo-manager.js').MapeoManager} manager */
  async function connect(manager) {
    const address = await manager.startLocalPeerDiscoveryServer()
    addresses.set(manager, address)
    // Dial everyone we already know about, and have them dial us.
    for (const [other, otherAddress] of addresses) {
      if (other === manager) continue
      manager.connectLocalPeer({
        address: '127.0.0.1',
        name: otherAddress.name,
        port: otherAddress.port,
      })
      other.connectLocalPeer({
        address: '127.0.0.1',
        name: address.name,
        port: address.port,
      })
    }
  }

  /** @param {import('../src/mapeo-manager.js').MapeoManager} manager */
  async function disconnect(manager) {
    addresses.delete(manager)
    await manager.stopLocalPeerDiscoveryServer({ force: true })
  }

  async function disconnectAll() {
    await Promise.all(
      managers.map((m) => m.stopLocalPeerDiscoveryServer({ force: true }))
    )
  }

  return { connect, disconnect, disconnectAll }
}

test(
  '[P0 reconnect] data created while a peer is disconnected syncs after reconnect (3 peers)',
  { timeout: 120_000 },
  async (t) => {
    const managers = await createManagers(3, t)
    const [a, b, c] = managers
    const [invitor, ...invitees] = managers

    // Invite everyone into one project.
    const disconnectInvite = connectPeers(managers)
    const projectId = await invitor.createProject({ name: 'Mapeo' })
    await invite({ invitor, invitees, projectId })
    await disconnectInvite()

    const projects = await Promise.all(
      managers.map((m) => m.getProject(projectId))
    )
    const [, , projectC] = projects

    // All three connect and fully sync a clean slate.
    const peers = connectablePeers(managers)
    t.after(peers.disconnectAll)
    await peers.connect(a)
    await peers.connect(b)
    await peers.connect(c)
    await waitForPeers(managers)
    for (const project of projects) project.$sync.start()
    await waitForSync(projects, 'full')

    // C goes offline. A and B keep syncing to each other.
    await peers.disconnect(c)

    const docsWhileOffline = (
      await seedDatabases([projects[0], projects[1]], {
        schemas: ['observation'],
      })
    ).flat()
    assert(docsWhileOffline.length > 0, 'created docs while C was offline')

    await waitForSync([projects[0], projects[1]], 'full')

    // Sanity: C has not received the offline-created docs yet.
    const cBefore = await projectC.observation.getMany()
    assert(
      cBefore.length < docsWhileOffline.length,
      'C is missing data created while it was offline'
    )

    // C reconnects.
    await peers.connect(c)
    await waitForPeers(managers)
    for (const project of projects) project.$sync.start()
    await waitForSync(projects, 'full')

    // C eventually receives everything A and B created while it was away.
    const expectedIds = new Set(docsWhileOffline.map((d) => d.docId))
    const cAfterIds = new Set(
      (await projectC.observation.getMany()).map((d) => d.docId)
    )
    for (const id of expectedIds) {
      assert(cAfterIds.has(id), `C received offline-created observation ${id}`)
    }

    // And all three converge on identical observation sets.
    const sets = await Promise.all(
      projects.map(
        async (p) =>
          new Set((await p.observation.getMany()).map((d) => d.docId))
      )
    )
    assert.deepEqual(sets[0], sets[1], 'A and B agree')
    assert.deepEqual(sets[0], sets[2], 'A and C agree')
  }
)

test(
  '[P0.11 / resume] disconnect mid-transfer then reconnect resumes to completion',
  { timeout: 180_000 },
  async (t) => {
    const managers = await createManagers(2, t)
    const [a, b] = managers
    const [invitor, ...invitees] = managers

    const disconnectInvite = connectPeers(managers)
    const projectId = await invitor.createProject({ name: 'Mapeo' })
    await invite({ invitor, invitees, projectId })
    await disconnectInvite()

    const projects = await Promise.all(
      managers.map((m) => m.getProject(projectId))
    )
    const [projectA, projectB] = projects

    // A builds up a large dataset while disconnected from B so there is a
    // meaningful amount of data to transfer (and a window to interrupt).
    const LARGE_COUNT = 600
    await seedDatabases([projectA], {
      schemas: ['observation'],
    })
    const extra = []
    for (let i = 0; i < LARGE_COUNT; i++) {
      extra.push(projectA.observation.create(validObservation()))
    }
    await Promise.all(extra)
    const expectedCount = (await projectA.observation.getMany()).length
    assert(expectedCount >= LARGE_COUNT, 'A has a large dataset')

    const peers = connectablePeers(managers)
    t.after(peers.disconnectAll)

    // Start sync, then yank the connection partway through. We can't pinpoint
    // the exact byte, so we disconnect after a short delay (before sync could
    // have completed for this volume) to land mid-transfer best-effort.
    await peers.connect(a)
    await peers.connect(b)
    await waitForPeers(managers)
    for (const project of projects) project.$sync.start()

    await delay(60)
    const bMidCount = (await projectB.observation.getMany()).length
    assert(
      bMidCount < expectedCount,
      `disconnecting before B finished (B had ${bMidCount}/${expectedCount})`
    )
    await peers.disconnect(b)

    // B has a partial copy. Reconnect and let sync resume to completion: this
    // exercises want/wanted + contiguousLength recovery after a mid-transfer
    // reconnect.
    await peers.connect(b)
    await waitForPeers(managers)
    for (const project of projects) project.$sync.start()
    await waitForSync(projects, 'full', { timeout: 120_000 })

    const aIds = new Set(
      (await projectA.observation.getMany()).map((d) => d.docId)
    )
    const bIds = new Set(
      (await projectB.observation.getMany()).map((d) => d.docId)
    )
    assert.equal(bIds.size, expectedCount, 'B received all of A after resume')
    assert.deepEqual(
      bIds,
      aIds,
      'B and A converged after mid-transfer reconnect'
    )
  }
)

test(
  '[BUG D1] overlapping reconnect from the same device keeps it represented in sync state',
  {
    timeout: 120_000,
  },
  async (t) => {
    const [ma, mb] = await createManagers(2, t)

    // Establish membership over local discovery, then take it down: the rest of
    // the test drives connections over a transport we fully control.
    const disconnectInvite = connectPeers([ma, mb])
    const projectId = await ma.createProject({ name: 'Mapeo' })
    await invite({ invitor: ma, invitees: [mb], projectId })
    await disconnectInvite()

    const projectA = await ma.getProject(projectId)
    const projectB = await mb.getProject(projectId)
    projectA.$sync.start()
    projectB.$sync.start()

    // First connection. `kProjectReplicate` does NOT dedup connections the way
    // local discovery's `chooseDevicePeer` does, so we can later open a second
    // one for the same identity — the exact overlap the D1 fix must survive
    // (and the situation the server-websocket path hits in production).
    /** @type {ReturnType<typeof connectProjectsControllably>[]} */
    const links = [connectProjectsControllably(projectA, projectB)]
    t.after(() => Promise.all(links.map((link) => link.destroy())))

    // Wait for B to actually connect + sync (the util waits for the peer to
    // appear before resolving; a bare waitForSync({timeoutMs}) would resolve
    // vacuously before the async handshake creates the peer).
    await waitForSync([projectA, projectB], 'full')
    assert(
      Object.hasOwn(
        projectA.$sync.getState().remoteDeviceSyncState,
        projectB.deviceId
      ),
      'sanity: B is represented on A over the first connection'
    )

    // Open a SECOND connection for the same device identity and wait for its
    // handshake + peer-add to land, so the new add reliably precedes the stale
    // remove (this is what makes the overlap deterministic instead of racy).
    links.push(connectProjectsControllably(projectA, projectB))
    await delay(3_000)

    // Drop the FIRST (now-stale) connection while the second is live. The bug:
    // link1's peer-remove runs `#pscByPeerId.delete(peerId)` and
    // `disconnectPeer(peerId)` unconditionally, removing the live link2 entry
    // and wiping B from the shared per-namespace state.
    await links[0].destroy()
    await delay(3_000)

    // Black-box post-conditions the D1 fix must guarantee, all via public API:
    // B is still a known sync peer, and sync still completes over link2.
    assert(
      Object.hasOwn(
        projectA.$sync.getState().remoteDeviceSyncState,
        projectB.deviceId
      ),
      'B still represented in A.remoteDeviceSyncState after the stale connection dropped'
    )
    await projectA.$sync.waitForSync('full', { timeoutMs: 15_000 })
  }
)

/** A valid observation value for bulk creation. */
function validObservation() {
  return valueOf(generate('observation')[0])
}
