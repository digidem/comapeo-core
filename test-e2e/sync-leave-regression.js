import test from 'node:test'
import assert from 'node:assert/strict'
import { LEFT_ROLE_ID, MEMBER_ROLE_ID } from '../src/roles.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'
import { connectProjectsControllably } from './controllable-wire.js'

// Regression test for the intermittent "Sync timeout" error users hit when
// leaving a project.
//
// `manager.leaveProject` performs the local leave (assign LEFT + kClearData)
// and then makes a best-effort attempt to propagate the LEFT role to connected
// peers via `waitForSync('initial', { timeoutMs })`. That propagation must NOT
// reject the leave if it stalls — the device has already left locally. Before
// the fix the trailing wait was awaited unconditionally, so a connected-but-
// slow/flaky peer (or the user moving out of range as they leave) made
// leaveProject reject with Error('Sync timeout').
//
// We reproduce a stalled-but-connected peer deterministically by driving the
// connection over a transport we control (test-e2e/controllable-wire.js) and
// pausing it at the moment of leaving. This takes ~45s (the internal
// INITIAL_SYNC_TIMEOUT_MS) because the fix lets the propagation time out and
// then swallows it.
test(
  'leaveProject does not reject when post-leave sync propagation stalls',
  { timeout: 90_000 },
  async (t) => {
    const [ma, mb] = await createManagers(2, t)

    // Establish membership over local discovery, then drive the sync phase over
    // a transport we control so we can stall it at the moment of leaving.
    const disconnectInvite = connectPeers([ma, mb])
    const projectId = await ma.createProject({ name: 'leave-stall' })
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
    // "connected" (the PSC stays), but no bytes flow — a common mobile scenario.
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
    // ...so a transient propagation stall must not surface as a thrown error.
    assert.equal(
      leaveError,
      null,
      `leaveProject rejected on a stalled best-effort propagation: ${
        leaveError instanceof Error ? leaveError.message : String(leaveError)
      }`
    )
  }
)
