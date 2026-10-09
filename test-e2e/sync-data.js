import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { createSyncScenario } from './sync-scenario.js'
import { getKeys } from '../test/helpers/core-manager.js'
import { kCoreManager } from '../src/mapeo-project.js'
import { NAMESPACES, INITIAL_SYNC_NAMESPACES } from '../src/constants.js'

// Data sync happy paths: documents converge across devices, at realistic
// data volumes. Several sync code paths (multi-word bitfields, stream
// buffering, batching) only activate once cores hold more than a handful of
// blocks, so the scenarios here deliberately seed hundreds of documents.

test(
  'data and config converge across five devices with realistic volumes',
  { timeout: 300_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: {
        creator: {},
        member1: {},
        member2: {},
        member3: {},
        member4: {},
      },
      connected: false,
    })

    // Each device collects data while offline. >32 observations per device
    // crosses the 32-bit bitfield word boundary in each core; the total
    // (~600) exercises multi-batch indexing and wire buffering.
    for (const name of ['creator', 'member1', 'member2', 'member3']) {
      await s.seed(name, { observation: 120, preset: 4, field: 4 })
    }
    // One device has a *large* core and one has an empty one, so sync mixes
    // very unequal core lengths
    await s.seed('member4', { observation: 250 })

    await s.connect()

    // Initial sync moves config (presets/fields) but not data
    await s.waitForSync('initial', undefined, { timeout: 60_000 })
    const allPresets = Object.values(s.seeded).flatMap(
      (docs) => docs.preset ?? []
    )
    await s.assertDocsConverged(
      ['creator', 'member1', 'member2', 'member3', 'member4'],
      'preset',
      { expected: allPresets }
    )

    const observationCount = async (/** @type {string} */ name) =>
      (await s.project(name).observation.getMany()).length
    assert.equal(
      await observationCount('member4'),
      250,
      'no observations moved before data sync started (member4 has only its own)'
    )

    s.startDataSync()
    await s.waitForSync('all', undefined, { timeout: 240_000 })

    const allObservations = Object.values(s.seeded).flatMap(
      (docs) => docs.observation ?? []
    )
    assert.equal(allObservations.length, 120 * 4 + 250)
    await s.assertDocsConverged(
      ['creator', 'member1', 'member2', 'member3', 'member4'],
      'observation',
      { expected: allObservations }
    )
  }
)

test('devices share all core keys with each other', async (t) => {
  const COUNT = 5
  const s = await createSyncScenario(t, {
    devices: Object.fromEntries(
      ['creator', 'm1', 'm2', 'm3', 'm4'].map((name) => [name, {}])
    ),
  })
  const names = ['creator', 'm1', 'm2', 'm3', 'm4']

  await s.waitForSync('initial')

  // After initial sync every device has every device's initial-namespace
  // cores (auth cores via the project extension, config/blobIndex via
  // core-ownership records)
  for (const ns of INITIAL_SYNC_NAMESPACES) {
    for (const name of names) {
      const cm = s.project(name)[kCoreManager]
      assert.equal(getKeys(cm, ns).length, COUNT, `${name} has all ${ns} cores`)
    }
  }

  s.startDataSync()
  await s.waitForSync('all')

  for (const ns of NAMESPACES) {
    for (const name of names) {
      const cm = s.project(name)[kCoreManager]
      assert.equal(getKeys(cm, ns).length, COUNT, `${name} has all ${ns} cores`)
    }
  }
})

test(
  'data relays transitively: A ↔ B ↔ C with A and C never directly connected',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { a: {}, b: {}, c: {} },
      connected: false,
    })

    // Build a line topology: A ↔ B ↔ C
    await s.connect('a', 'b')
    await s.connect('b', 'c')

    s.startDataSync()

    const { observation } = await s.seed('a', { observation: 40 })

    // A's docs must reach C only by relaying through B. There is no
    // waitForSync covering A→C (they aren't connected), so poll C.
    const cProject = s.project('c')
    const deadline = Date.now() + 60_000
    /** @type {unknown} */
    let lastDoc = null
    while (Date.now() < deadline) {
      lastDoc = await cProject.observation
        .getByDocId(observation[observation.length - 1].docId)
        .catch(() => null)
      if (lastDoc) break
      await delay(500)
    }
    assert(lastDoc, "A's observations reached C through B")
    await s.assertDocsConverged(['a', 'c'], 'observation', {
      expected: observation,
    })
  }
)
