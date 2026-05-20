import test from 'node:test'
import assert from 'node:assert/strict'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { BLOCKED_ROLE_ID } from '../src/roles.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'

// Regression test for mid-session role downgrades.
//
// When a coordinator changes a peer's role to BLOCKED while that peer's
// protomux session is still alive, the coordinator's PeerSyncController
// for that peer must refresh its cached sync capability. Today it does
// not:
//
// - PSC#updatePeerState only refreshes capability when the auth namespace
//   transitions not-synced → synced.
// - On the coordinator side, after writing a role doc themselves, their
//   own auth.localState.want stays at 0 throughout, so syncStatus[auth]
//   never leaves 'synced' and the transition never fires.
// - SyncApi#handleRoleUpdate IS called on role doc changes (via the
//   roles.on('update') wiring), but only ever calls
//   #validateRoleAndAddCoresForPeer — never refreshes capability on
//   existing PSCs.
//
// Result: role downgrades keep replicating to the now-blocked peer until
// the protomux session ends — a data leak.
test('role downgrade (member → blocked) stops replication on the same session', async (t) => {
  const [invitor, invitee] = await createManagers(2, t)
  const disconnect = connectPeers([invitor, invitee])
  t.after(disconnect)

  const projectId = await invitor.createProject({ name: 'block-mid-session' })
  await invite({ invitor, invitees: [invitee], projectId })
  const invitorProject = await invitor.getProject(projectId)
  const inviteeProject = await invitee.getProject(projectId)

  // Get to a steady state with real data, both peers actively syncing.
  const initialDocs = generate('observation', { count: 20 })
  for (const o of initialDocs) {
    await invitorProject.observation.create(valueOf(o))
  }
  invitorProject.$sync.start()
  inviteeProject.$sync.start()
  await waitForSync([invitorProject, inviteeProject], 'full', {
    timeout: 30_000,
  })

  // Sanity: invitor sees invitee as data-enabled before the block.
  {
    const inviteeView =
      invitorProject.$sync.getState().remoteDeviceSyncState[invitee.deviceId]
    assert(
      inviteeView?.data.isSyncEnabled,
      'invitor sees invitee data-enabled pre-block'
    )
  }

  await invitorProject.$member.assignRole(invitee.deviceId, BLOCKED_ROLE_ID)

  // The sync state on the invitor must reflect the capability change
  // without waiting for a protomux session cycle.
  await new Promise((res, rej) => {
    const timer = setTimeout(() => {
      invitorProject.$sync.off('sync-state', onState)
      rej(new Error('data sync was not disabled within 30s of block'))
    }, 30_000)
    /**
     * @param {import('../src/sync/sync-api.js').State} state
     */
    const onState = ({ remoteDeviceSyncState }) => {
      if (!remoteDeviceSyncState[invitee.deviceId]?.data.isSyncEnabled) {
        clearTimeout(timer)
        invitorProject.$sync.off('sync-state', onState)
        res(void 0)
      }
    }
    invitorProject.$sync.on('sync-state', onState)
    onState(invitorProject.$sync.getState())
  })

  // Behavioural assertion: docs created after the block must not reach
  // the blocked peer.
  const postBlockDoc = await invitorProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await new Promise((r) => setTimeout(r, 2_000))
  const inviteeHas = await inviteeProject.observation.getByDocId(
    postBlockDoc.docId,
    { mustBeFound: false }
  )
  assert.equal(
    inviteeHas,
    null,
    'blocked invitee did not receive doc created after block'
  )
})
