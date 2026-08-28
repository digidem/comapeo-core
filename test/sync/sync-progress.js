import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter, once } from 'node:events'
import { SyncProgress } from '../../src/sync/sync-progress.js'
import { createCore } from '../helpers/create-core.js'
import { discoveryKey } from 'hypercore-crypto'

/**
 * Minimal stand-ins for CoreManager and BlobStore: SyncProgress only uses
 * their event emitters, `getCores`, `deviceId` and `getBlobFilter`.
 */
function createFakes() {
  const coreManager = Object.assign(new EventEmitter(), {
    deviceId: 'a'.repeat(64),
    getCores: () => [],
  })
  const blobStore = Object.assign(new EventEmitter(), {
    getBlobFilter: () => null,
  })
  return { coreManager, blobStore }
}

test('cores known only from pre-haves are excluded from progress', async (t) => {
  const { coreManager, blobStore } = createFakes()
  const progress = new SyncProgress({
    // @ts-expect-error - minimal fake
    coreManager,
    // @ts-expect-error - minimal fake
    blobStore,
    isPeerSyncAllowed: () => true,
    throttleMs: 0,
  })
  t.after(() => progress.close())

  const peerId = 'b'.repeat(64)
  progress.addPeer(peerId)

  // A pre-have arrives for a core we have not added (e.g. a removed
  // device's core, still held by the connected peer). It must not create
  // pending work: we will never replicate this core, so counting it would
  // block sync completion forever.
  const core = await createCore(t)
  await core.append(['a', 'b', 'c'])
  assert(core.key)
  const coreDiscoveryId = discoveryKey(core.key).toString('hex')
  coreManager.emit('peer-have', 'data', {
    coreDiscoveryId,
    peerId,
    start: 0,
    bitfield: new Uint32Array([0b111]),
  })
  await once(progress, 'update')

  let snapshot = progress.getSnapshot()
  assert.equal(
    snapshot.data.local.toReceive,
    0,
    'pre-have-only core contributes nothing to pending counts'
  )
  assert.equal(
    snapshot.data.devices[peerId]?.toReceive ?? 0,
    0,
    'per-device counts also exclude it'
  )

  // Once the core IS added (as an empty local replica — we hold none of its
  // blocks), the tracked pre-have state counts
  const replica = await createCore(t, core.key)
  coreManager.emit('add-core', {
    core: replica,
    namespace: 'data',
    key: core.key,
  })
  await once(progress, 'update')
  snapshot = progress.getSnapshot()
  assert.equal(
    snapshot.data.devices[peerId].toReceive,
    3,
    "after the core is added, the peer's pre-haves count as receivable"
  )
  assert.equal(snapshot.data.coreCount, 1)
})
