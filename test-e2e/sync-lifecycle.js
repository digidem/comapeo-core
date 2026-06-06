import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { LEFT_ROLE_ID, MEMBER_ROLE_ID } from '../src/roles.js'
import { kCoreManager } from '../src/mapeo-project.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'
import { connectProjectsControllably } from './controllable-wire.js'

// LEAVE / CLOSE lifecycle repros for sync-review.md findings A1, A2, A3, A4 and
// test gaps P0.6, P0.12, P0.13.
//
// The `[BUG …]` / `[P0.…]` tests are intentionally-failing reproductions tagged
// with the node:test `todo` option: they throw against current code (reported
// `not ok … # TODO`, which does NOT fail the suite) and will start passing once
// the corresponding fix lands. The remaining tests are normal coverage tests
// for behavior that is already correct today.
//
// Every test sets an explicit timeout so a hang fails fast.
//
// Harness notes discovered while writing these:
// - `MapeoProject extends ReadyResource`; `project.close()` is the public,
//   idempotent wrapper around `_close()`. `manager.close()` closes every active
//   project then the manager's own sqlite. `createManager` already registers a
//   `t.after(() => manager.close())`, so closing a single project explicitly is
//   safe (the later manager.close() re-closes idempotently).
// - The SyncApi-owned listeners live on `project[kCoreManager].creatorCore`.
//   SyncApi registers exactly one `peer-add` + one `peer-remove` there
//   (sync-api.js:148-149) and never removes them. `peer-remove` is ONLY
//   registered by SyncApi and by CoreSyncState (core-sync-state.js:160) — the
//   CoreManager itself never registers `peer-remove` on the creator core — so a
//   `peer-remove` listenerCount of 0 after a full close is the clean,
//   fix-sensitive signal that A1's `SyncApi.close()` + A3's CoreSyncState
//   teardown have run.
// - The A4 unhandled rejection (`core.update({ wait: true })` cancelled with
//   REQUEST_CANCELLED on close) requires a peer to be genuinely mid-upgrade at
//   the instant of close. On TCP loopback the upgrade round-trip resolves within
//   a couple of event-loop ticks, so the pending window is effectively zero and
//   the rejection could NOT be provoked deterministically here. The A4 test
//   therefore anchors its hard, fails-today assertion on the shared root cause
//   (SyncApi never tears down on close) and keeps the unhandled-rejection guard
//   as a best-effort secondary check.

/**
 * @param {import('../src/mapeo-project.js').MapeoProject} project
 * @param {number} count
 */
async function seed(project, count) {
  for (const o of generate('observation', { count })) {
    await project.observation.create(valueOf(o))
  }
}

/**
 * Install a one-shot unhandledRejection guard that records the first rejection.
 * Removes node's own listeners for the duration of the test (so a provoked
 * rejection doesn't tear down the runner) and restores them in t.after.
 *
 * @param {import('node:test').TestContext} t
 */
function captureUnhandledRejection(t) {
  /** @type {unknown} */
  let captured
  let didCapture = false
  /** @param {unknown} reason */
  const onUnhandled = (reason) => {
    if (!didCapture) {
      didCapture = true
      captured = reason
    }
  }
  const previous = process.listeners('unhandledRejection')
  for (const listener of previous) {
    process.off('unhandledRejection', listener)
  }
  process.on('unhandledRejection', onUnhandled)
  t.after(() => {
    process.off('unhandledRejection', onUnhandled)
    for (const listener of previous) {
      process.on('unhandledRejection', listener)
    }
  })
  return {
    get reason() {
      return captured
    },
    get didCapture() {
      return didCapture
    },
    /** @returns {string} */
    describe() {
      return captured instanceof Error ? captured.message : String(captured)
    },
  }
}

test(
  '[BUG A4] closing a project mid-sync tears down the SyncApi and raises no unhandled rejection',
  {
    todo: 'BUG A4 (+A1/A3): SyncApi has no close(), so its creatorCore listeners survive close; on real-latency links the in-flight core.update({wait:true}) also rejects REQUEST_CANCELLED unhandled',
    timeout: 60_000,
  },
  async (t) => {
    const managers = await createManagers(2, t)
    const disconnect = connectPeers(managers)
    t.after(disconnect)

    const [creator, member] = managers
    const projectId = await creator.createProject({ name: 'a4' })
    await invite({
      invitor: creator,
      invitees: [member],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const [creatorProject, memberProject] = await Promise.all(
      managers.map((m) => m.getProject(projectId))
    )

    await seed(creatorProject, 60)
    await seed(memberProject, 60)

    creatorProject.$sync.start()
    memberProject.$sync.start()

    await waitForSync([creatorProject, memberProject], 'initial')

    const creatorCore = memberProject[kCoreManager].creatorCore
    const guard = captureUnhandledRejection(t)

    // Close while data is still flowing.
    await memberProject.close()

    // Let any cancelled-upgrade rejection surface.
    await delay(500)

    // Best-effort: on a real-latency link the cancelled core.update({wait:true})
    // rejects unhandled here. Not provokable on loopback (see file header).
    assert.equal(
      guard.didCapture,
      false,
      `unexpected unhandled rejection on close: ${guard.describe()}`
    )

    // Hard, fails-today assertion on the shared root cause: closing the project
    // must tear down the SyncApi's listeners on the creator core. Today SyncApi
    // has no close(), so its peer-remove listener (and CoreSyncState's) survive.
    assert.equal(
      creatorCore.listenerCount('peer-remove'),
      0,
      'SyncApi/CoreSyncState peer-remove listeners must be removed when the project closes'
    )
  }
)

test(
  '[BUG A1] SyncApi exposes an idempotent close()',
  {
    todo: 'BUG A1: SyncApi has no close() to tear down listeners/timers/sockets',
    timeout: 10_000,
  },
  async (t) => {
    const [manager] = await createManagers(1, t)
    const projectId = await manager.createProject({ name: 'a1' })
    const project = await manager.getProject(projectId)

    // `close` does not exist on SyncApi today (that absence IS bug A1), so cast
    // to keep the runtime assertion meaningful without a compile-time error.
    const sync = /** @type {any} */ (project.$sync)
    assert.equal(
      typeof sync.close,
      'function',
      'SyncApi should expose a close() method'
    )

    // Idempotent: calling twice must not throw.
    await sync.close()
    await sync.close()
  }
)

test(
  '[BUG A2] leaveProject must not reject when post-leave sync propagation stalls',
  {
    // CONFIRMED production bug ("Sync timeout" when leaving a project, observed
    // intermittently by real users). `manager.leaveProject` performs the local
    // leave (assign LEFT + kClearData) and THEN awaits a trailing
    // `waitForSync('initial', { timeoutMs: 45_000 })` to propagate the LEFT
    // role. That wait is awaited unconditionally, so when a peer is connected
    // but presync cannot complete within 45s (slow/flaky link, peer moves out of
    // range right as the user leaves) leaveProject rejects with
    // Error('Sync timeout') even though the device has ALREADY left locally.
    // Fixed on branch fix/leave-project-timeout (mapeo-manager.js): the trailing
    // propagation wait is made best-effort.
    todo: 'BUG A2: leaveProject rejects with "Sync timeout" when the best-effort post-leave propagation stalls, despite the local leave having already succeeded. mapeo-manager.js leaveProject',
    timeout: 90_000,
  },
  async (t) => {
    const [ma, mb] = await createManagers(2, t)

    // Establish membership over local discovery, then drive the sync phase over
    // a transport we control so we can stall it at the moment of leaving.
    const disconnectInvite = connectPeers([ma, mb])
    const projectId = await ma.createProject({ name: 'a2' })
    await invite({
      invitor: ma,
      invitees: [mb],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })
    await disconnectInvite()

    const creatorProject = await ma.getProject(projectId)
    const memberProject = await mb.getProject(projectId)

    const link = connectProjectsControllably(creatorProject, memberProject)
    t.after(() => link.destroy())

    creatorProject.$sync.start()
    memberProject.$sync.start()
    await waitForSync([creatorProject, memberProject], 'initial')

    // The connection degrades exactly as the member leaves: the peer is still
    // "connected" (the PSC stays), but no bytes flow — a very common mobile
    // scenario. The local leave still completes; only propagation stalls.
    link.pause()

    /** @type {unknown} */
    let leaveError = null
    await mb.leaveProject(projectId).catch((err) => {
      leaveError = err
    })

    // The local leave succeeded regardless — the device IS left...
    assert.equal(
      (await memberProject.$getOwnRole()).roleId,
      LEFT_ROLE_ID,
      'the device has locally left (LEFT role assigned, data cleared)'
    )
    // ...so a transient propagation stall must not surface as a thrown error to
    // the host app. Today it does: leaveProject rejects with "Sync timeout".
    assert.equal(
      leaveError,
      null,
      `leaveProject rejected on a stalled best-effort propagation: ${
        leaveError instanceof Error ? leaveError.message : String(leaveError)
      }`
    )
  }
)

test(
  '[P0.12] calling leaveProject and the close path concurrently is safe (idempotent)',
  {
    todo: 'P0.12: _close has no idempotency/ordering guard; a close racing the post-leave auth-resync operates on half-torn-down state',
    timeout: 60_000,
  },
  async (t) => {
    const managers = await createManagers(2, t)
    const disconnect = connectPeers(managers)
    t.after(disconnect)

    const [creator, member] = managers
    const projectId = await creator.createProject({ name: 'p012' })
    await invite({
      invitor: creator,
      invitees: [member],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const [creatorProject, memberProject] = await Promise.all(
      managers.map((m) => m.getProject(projectId))
    )

    await seed(creatorProject, 40)
    await seed(memberProject, 40)

    creatorProject.$sync.start()
    memberProject.$sync.start()

    await waitForSync([creatorProject, memberProject], 'initial')

    const guard = captureUnhandledRejection(t)

    // Race the leave (kProjectLeave -> kClearData -> post-leave auth resync)
    // against the project close path. Today this rejects with
    // "Cannot await idle after closing" because _close tears down the
    // ReadyResource while the leave's waitForSync is still awaiting it.
    const results = await Promise.allSettled([
      member.leaveProject(projectId),
      memberProject.close(),
    ])

    await delay(500)

    const rejected = results.filter((r) => r.status === 'rejected')
    assert.equal(
      rejected.length,
      0,
      `neither leave nor close should reject, got: ${rejected
        .map((r) =>
          r.reason instanceof Error ? r.reason.message : String(r.reason)
        )
        .join('; ')}`
    )
    assert.equal(
      guard.didCapture,
      false,
      `unexpected unhandled rejection during leave/close race: ${guard.describe()}`
    )
  }
)

test(
  '[P0.13] no leaked SyncApi listeners on the creator core after a project is fully closed',
  {
    todo: 'P0.13 (A1): SyncApi registers peer-add/peer-remove on creatorCore in its constructor and never removes them',
    timeout: 60_000,
  },
  async (t) => {
    const managers = await createManagers(2, t)
    const disconnect = connectPeers(managers)
    t.after(disconnect)

    const [creator, member] = managers
    const projectId = await creator.createProject({ name: 'p013' })
    await invite({
      invitor: creator,
      invitees: [member],
      projectId,
      roleId: MEMBER_ROLE_ID,
    })

    const [creatorProject, memberProject] = await Promise.all(
      managers.map((m) => m.getProject(projectId))
    )

    creatorProject.$sync.start()
    memberProject.$sync.start()
    await waitForSync([creatorProject, memberProject], 'initial')

    const creatorCore = memberProject[kCoreManager].creatorCore

    // Precondition: SyncApi (and CoreSyncState) registered peer-remove listeners.
    assert(
      creatorCore.listenerCount('peer-remove') > 0,
      'peer-remove listeners are registered while the project is open (test precondition)'
    )

    await memberProject.close()

    // `peer-remove` on the creator core is registered ONLY by SyncApi
    // (sync-api.js:149) and CoreSyncState (core-sync-state.js:160); the
    // CoreManager never registers it there. After a full close both should be
    // gone. Today they leak (SyncApi has no close(), CoreSyncState has no
    // teardown), so this is non-zero.
    assert.equal(
      creatorCore.listenerCount('peer-remove'),
      0,
      'no peer-remove listeners remain on the creator core after close'
    )
  }
)
