import assert from 'node:assert/strict'
import test from 'node:test'
import {
  connectPeers,
  createManager,
  createOldManager,
  invite,
  waitForPeers,
} from '../utils.js'
import { VERSIONS } from './versions.js'

/**
 * Managers are `any` because either side may be an old @comapeo/core version
 * (`createOldManager` is untyped) — the helpers used here are duck-typed.
 *
 * @param {any} invitor
 * @param {any} invitee
 * @param {import('node:test').TestContext} t
 */
async function assertInviteWorks(invitor, invitee, t) {
  const disconnect = connectPeers([invitor, invitee])
  t.after(disconnect)
  await waitForPeers([invitor, invitee])

  /** @type {[Array<{ deviceId: string }>, Array<{ deviceId: string }>]} */
  const [invitorPeers, inviteePeers] = await Promise.all([
    invitor.listLocalPeers(),
    invitee.listLocalPeers(),
  ])
  assert.equal(invitorPeers.length, 1, 'invitor sees 1 peer')
  assert.equal(inviteePeers.length, 1, 'invitee sees 1 peer')
  assert(
    invitorPeers.some((p) => p.deviceId === invitee.deviceId),
    'invitor sees invitee'
  )
  assert(
    inviteePeers.some((p) => p.deviceId === invitor.deviceId),
    'invitee sees invitor'
  )

  const projectId = await invitor.createProject({ name: 'cross-version' })
  await invite({ projectId, invitor, invitees: [invitee] })

  const inviteeProject = await invitee.getProject(projectId)
  assert.equal(
    (await inviteeProject.$getProjectSettings()).name,
    'cross-version',
    'invitee joined the project and reads its settings'
  )
}

for (const version of VERSIONS) {
  test(`invite: @comapeo/core@${version.coreVersion} (${version.appRelease}) invites current`, async (t) => {
    const oldManager = await createOldManager(version.coreVersion, t, 'old')
    await oldManager.setDeviceInfo({ name: 'old', deviceType: 'mobile' })
    const newManager = createManager('new', t)
    await newManager.setDeviceInfo({ name: 'new', deviceType: 'mobile' })

    await assertInviteWorks(oldManager, newManager, t)
  })

  test(`invite: current invites @comapeo/core@${version.coreVersion} (${version.appRelease})`, async (t) => {
    const oldManager = await createOldManager(version.coreVersion, t, 'old')
    await oldManager.setDeviceInfo({ name: 'old', deviceType: 'mobile' })
    const newManager = createManager('new', t)
    await newManager.setDeviceInfo({ name: 'new', deviceType: 'mobile' })

    await assertInviteWorks(newManager, oldManager, t)
  })
}
