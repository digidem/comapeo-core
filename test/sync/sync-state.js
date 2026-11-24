import test from 'node:test'
import assert from 'node:assert/strict'
import { SyncState } from '../../src/sync/sync-state.js'
import { createCore } from '../helpers/create-core.js'

/**
 * Wait for all pending `process.nextTick` callbacks (i.e. the state-update
 * notifications) to run.
 * @returns {Promise<void>}
 */
const flushTicks = () => new Promise((resolve) => setImmediate(resolve))

/**
 * Wait `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Build a `SyncState` backed by a single real core (for the `auth` namespace)
 * behind a minimal fake core manager / blob store. Only the `auth` namespace
 * has a core, which is enough for `addPeer` / `disconnectPeer` to drive the
 * state-update path.
 * @param {import('node:test').TestContext} t
 * @param {{ throttleMs?: number }} [opts]
 * @returns {Promise<SyncState>}
 */
async function makeSyncState(t, { throttleMs = 100 } = {}) {
  const core = await createCore(t)
  // Minimal stand-ins so we don't have to spin up (and tear down) a full
  // CoreManager + BlobStore, which is overkill for this and whose close path
  // is flaky when there is nothing to replicate. `getCores` exposes the one
  // real core for the `auth` namespace, which is enough for `addPeer` /
  // `disconnectPeer` to drive the state-update path.
  const coreManager =
    /** @type {import('../../src/core-manager/index.js').CoreManager} */ (
      /** @type {unknown} */ ({
        deviceId: 'local-device',
        /** @param {string} namespace */
        getCores: (namespace) =>
          namespace === 'auth' ? [{ core, key: core.key }] : [],
        on: () => {},
      })
    )
  const blobStore =
    /** @type {import('../../src/blob-store/index.js').BlobStore} */ (
      /** @type {unknown} */ ({
        on: () => {},
        getBlobFilter: () => null,
      })
    )

  return new SyncState({
    coreManager,
    peerSyncControllers: new Map(),
    blobStore,
    throttleMs,
  })
}

test('SyncState emits a lossless, unthrottled "update" alongside the throttled "state" event', async (t) => {
  // Regression test for the flaky "initial sync" CI failures:
  // `#waitForInitialSyncWithPeer` gates a one-shot completion on a state
  // transition. If that transition is transient (a peer reaches a synced state
  // and disconnects before the throttled `state` event fires), a consumer
  // relying only on the throttled `state` event would never observe it and
  // would wrongly time out. The unthrottled `update` event exists so such
  // consumers can re-read state on every real change. This test locks in that
  // contract.
  const syncState = await makeSyncState(t)
  syncState.setMaxListeners(0)

  let updateCount = 0
  let stateCount = 0
  syncState.on('update', () => {
    updateCount++
  })
  syncState.on('state', () => {
    stateCount++
  })

  // Drive several rapid, distinct mutations within a single throttle window.
  for (let i = 0; i < 10; i++) {
    const peerId = `peer${i}`
    syncState.addPeer(peerId)
    await flushTicks()
    syncState.disconnectPeer(peerId)
    await flushTicks()
  }

  // Wait past the throttle window so any trailing `state` emission can fire.
  await sleep(200)

  // The `update` event must be lossless: it is emitted for every state change,
  // so a consumer re-reading state on `update` can observe each intermediate
  // state. On the old code (no `update` event) this would be 0 and fail.
  assert.ok(
    updateCount >= 10,
    `expected at least one "update" per mutation (10), got ${updateCount}`
  )

  // The `state` event is throttled: the rapid mutations must be coalesced into
  // far fewer `state` emissions than there were `update` emissions. This is the
  // lossiness that the `update` event compensates for.
  assert.ok(
    stateCount < updateCount,
    `expected throttled "state" (${stateCount}) to be emitted fewer times than "update" (${updateCount})`
  )
})

test('a transient peer state is observable via "update" but coalesced away by "state"', async (t) => {
  // Directly mirrors the bug: a peer is added (state present) and disconnected
  // (state gone) within one throttle window. A consumer listening to the
  // unthrottled `update` event and re-reading state will observe the peer while
  // it exists; the throttled `state` event may never report it at all.
  const syncState = await makeSyncState(t)
  syncState.setMaxListeners(0)

  const peerId = 'transient-peer'
  let sawPeerViaUpdate = false

  // Lossless observer: re-read state on every `update`.
  syncState.on('update', () => {
    const state = syncState.getState()
    if (state.auth.remoteStates[peerId]) sawPeerViaUpdate = true
  })

  syncState.addPeer(peerId)
  await flushTicks()
  // Disconnect immediately, within the same throttle window as the add.
  syncState.disconnectPeer(peerId)
  await flushTicks()
  await sleep(200)

  // The unthrottled observer must have caught the peer while it existed. This
  // is the exact observation the old code (throttled `state` only) could miss.
  assert.ok(
    sawPeerViaUpdate,
    'the unthrottled "update" observer should have observed the transient peer'
  )

  const finalState = syncState.getState()
  assert.equal(
    finalState.auth.remoteStates[peerId],
    undefined,
    'peer is fully removed from state after disconnect'
  )
})
