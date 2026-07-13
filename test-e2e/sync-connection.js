import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { createSyncScenario } from './sync-scenario.js'
import { connectProjectsControllably } from './controllable-wire.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'

// Connection-lifecycle scenarios: devices going offline, reconnecting,
// resuming interrupted transfers, and overlapping connections from the same
// device. These are historically where sync state-accounting bugs have lived.

test(
  'data created while a device is offline syncs when it reconnects',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { a: {}, b: {}, c: {} },
    })

    s.startDataSync()
    await s.waitForSync('all')

    // C goes offline; A and B keep collecting and syncing
    await s.disconnect('c')

    const seededA = await s.seed('a', { observation: 60 })
    const seededB = await s.seed('b', { observation: 60 })
    await s.waitForSync('all', ['a', 'b'])

    const cObservations = await s.project('c').observation.getMany()
    assert.equal(
      cObservations.length,
      0,
      'C has none of the offline-created data yet'
    )

    // C reconnects and catches up
    await s.connect()
    s.startDataSync()
    await s.waitForSync('all')

    await s.assertDocsConverged(['a', 'b', 'c'], 'observation', {
      expected: [...seededA.observation, ...seededB.observation],
    })
  }
)

test(
  'a transfer interrupted mid-flight resumes to completion on reconnect',
  { timeout: 300_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { source: {}, sink: {} },
      connected: false,
    })

    // A large dataset so the disconnect genuinely lands mid-transfer, and so
    // resume exercises bitfield recovery across many 32-bit words
    await s.seed('source', { observation: 600 })
    const expected = s.seeded.source.observation

    await s.connect()
    s.startDataSync()

    // Yank the connection early — before a 600-doc transfer can complete
    await delay(60)
    const sinkMidCount = (await s.project('sink').observation.getMany()).length
    assert(
      sinkMidCount < expected.length,
      `disconnected before the transfer finished (sink had ${sinkMidCount}/${expected.length})`
    )
    await s.disconnect('sink')

    // Reconnect: sync must resume from the partial copy and complete
    await s.connect()
    s.startDataSync()
    await s.waitForSync('all', undefined, { timeout: 240_000 })

    await s.assertDocsConverged(['source', 'sink'], 'observation', {
      expected,
    })
  }
)

test(
  'overlapping reconnect: a second connection from the same device replaces the first safely',
  { timeout: 120_000 },
  async (t) => {
    // Uses the controllable wire (kProjectReplicate) because unlike local
    // discovery it does not dedupe connections, so we can hold two live
    // connections for the same device identity — the overlap that used to
    // corrupt sync state when the stale connection's teardown removed the
    // live connection's entries.
    const [ma, mb] = await createManagers(2, t)

    const disconnectInvite = connectPeers([ma, mb])
    const projectId = await ma.createProject({ name: 'overlap' })
    await invite({ invitor: ma, invitees: [mb], projectId })
    await disconnectInvite()

    const projectA = await ma.getProject(projectId)
    const projectB = await mb.getProject(projectId)
    projectA.$sync.start()
    projectB.$sync.start()

    /** @type {ReturnType<typeof connectProjectsControllably>[]} */
    const links = [connectProjectsControllably(projectA, projectB)]
    t.after(() => Promise.all(links.map((link) => link.destroy())))

    await waitForSync([projectA, projectB], 'all')
    assert(
      Object.hasOwn(projectA.$sync.getState().devices, projectB.deviceId),
      'B is a sync peer over the first connection'
    )

    // Open a SECOND connection for the same device identity and let its
    // handshake land, so the device briefly has two live connections
    links.push(connectProjectsControllably(projectA, projectB))
    await delay(3_000)

    // Drop the FIRST (now stale) connection while the second is live. The
    // device must stay represented in sync state, and sync must still
    // complete over the surviving connection.
    await links[0].destroy()
    await delay(3_000)

    assert(
      Object.hasOwn(projectA.$sync.getState().devices, projectB.deviceId),
      'B is still a sync peer after the stale connection dropped'
    )
    await projectA.$sync.waitForSync('all', { timeoutMs: 15_000 })

    // And data still flows over the surviving connection
    const doc = await projectB.observation.create(
      valueOf(generate('observation')[0])
    )
    const deadline = Date.now() + 20_000
    /** @type {unknown} */ let received = null
    while (Date.now() < deadline) {
      received = await projectA.observation
        .getByDocId(doc.docId)
        .catch(() => null)
      if (received) break
      await delay(200)
    }
    assert(received, 'data still syncs over the surviving connection')
  }
)
