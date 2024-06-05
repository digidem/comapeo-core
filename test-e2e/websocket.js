// TODO: maybe rename this file?
import test from 'node:test'
import assert from 'node:assert/strict'
import { createManagers, invite, waitForPeers, waitForSync } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import WebsocketManagerWrapper from '../src/cloud-server/manager-wrapper.js'

test('websocket e2e test', async (t) => {
  const managers = await createManagers(2, t)
  const [mobileManager, cloudManager] = managers

  const cloudWrapper = new WebsocketManagerWrapper(cloudManager)
  const port = 1337 // TODO
  await cloudWrapper.listen({ port })

  const address = `ws://localhost:${port}`
  mobileManager.connectDnsPeer({ address })

  t.after(async () => {
    mobileManager.disconnectDnsPeer({ address })
    await cloudWrapper.close()
  })

  await waitForPeers(managers)

  const mobileDeviceId = mobileManager.getDeviceInfo().deviceId
  const cloudDeviceId = cloudManager.getDeviceInfo().deviceId
  assert.deepEqual(
    (await cloudManager.listLocalPeers()).map((p) => p.deviceId),
    [mobileDeviceId]
  )
  assert.deepEqual(
    (await mobileManager.listLocalPeers()).map((p) => p.deviceId),
    [cloudDeviceId]
  )

  const projectId = await mobileManager.createProject({ name: 'mapeo' })
  await invite({
    invitor: mobileManager,
    invitees: [cloudManager],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [mobileProject, cloudProject] = projects

  mobileProject.$sync.start()
  cloudProject.$sync.start()

  const [observation1, observation2] = await Promise.all(
    projects.map((project) =>
      project.observation.create({
        schemaName: 'observation',
        attachments: [],
        tags: {},
        refs: [],
        metadata: {},
      })
    )
  )

  await waitForSync(projects, 'full')

  assert(
    await cloudProject.observation.getByDocId(observation1.docId),
    'Cloud project gets observation created by mobile client'
  )
  assert(
    await mobileProject.observation.getByDocId(observation2.docId),
    'Mobile project gets observation created by cloud'
  )
})
